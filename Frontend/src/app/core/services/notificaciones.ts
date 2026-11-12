import { DOCUMENT, Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Api } from './api';

/**
 * Qué puede hacer este celular con las notificaciones push:
 * - `no-soportado`: el navegador no tiene notificaciones push (o la página no está en https).
 * - `requiere-instalar`: iPhone/iPad en Safari: solo funcionan si HeladApp se agrega a la pantalla de inicio.
 * - `bloqueado`: la persona negó el permiso; solo se cambia desde la configuración del navegador.
 * - `disponible`: se pueden activar con un toque.
 */
export type SoporteAvisos = 'no-soportado' | 'requiere-instalar' | 'bloqueado' | 'disponible';

/** Resultado de intentar activar los avisos de un pedido. */
export type ResultadoActivacion = 'activo' | 'bloqueado' | 'cancelado' | 'error';

const clave = (pedidoId: number) => `heladapp.pedido.${pedidoId}.avisos`;

/**
 * Notificaciones push del cliente: con un toque, su celular recibe un aviso cuando el pedido
 * queda listo, aunque haya cerrado la app o bloqueado la pantalla. La API envía el aviso
 * (ver NotificacionesController) y el service worker (public/sw.js) lo muestra.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificacionesService {
  private readonly api = inject(Api);
  private readonly documento = inject(DOCUMENT);

  private get ventana(): (Window & typeof globalThis) | null {
    return this.documento.defaultView;
  }

  soporte(): SoporteAvisos {
    const v = this.ventana;
    if (!v) return 'no-soportado';
    const tienePush = v.isSecureContext && 'serviceWorker' in v.navigator && 'PushManager' in v && 'Notification' in v;
    if (!tienePush) {
      // En iPhone, Safari solo ofrece push a las apps agregadas a la pantalla de inicio (iOS 16.4+).
      const esIos = /iPhone|iPad|iPod/.test(v.navigator.userAgent) ||
        (v.navigator.platform === 'MacIntel' && v.navigator.maxTouchPoints > 1);
      const instalada = v.matchMedia?.('(display-mode: standalone)').matches ||
        (v.navigator as Navigator & { standalone?: boolean }).standalone === true;
      return esIos && !instalada && v.isSecureContext ? 'requiere-instalar' : 'no-soportado';
    }
    return v.Notification.permission === 'denied' ? 'bloqueado' : 'disponible';
  }

  /** Si en este celular ya se activaron los avisos de ese pedido (y el permiso sigue concedido). */
  activos(pedidoId: number): boolean {
    if (this.soporte() !== 'disponible' || this.ventana!.Notification.permission !== 'granted') return false;
    try {
      return localStorage.getItem(clave(pedidoId)) === '1';
    } catch {
      return false;
    }
  }

  /**
   * Pide permiso, suscribe el celular y se lo informa a la API.
   * Debe llamarse directo desde un toque o clic (los navegadores no piden permiso de otra forma).
   */
  async activar(pedidoId: number): Promise<ResultadoActivacion> {
    const v = this.ventana;
    if (!v || this.soporte() !== 'disponible') return 'error';

    // Primero el permiso: tiene que pedirse dentro del toque, antes de esperar cualquier otra cosa.
    const permiso = await v.Notification.requestPermission();
    if (permiso === 'denied') return 'bloqueado';
    if (permiso !== 'granted') return 'cancelado';

    try {
      await v.navigator.serviceWorker.register('/sw.js');
      const registro = await v.navigator.serviceWorker.ready;
      const { clavePublica } = await firstValueFrom(
        this.api.get<{ clavePublica: string }>('Notificaciones/clave-publica'));
      const claveServidor = base64UrlABytes(clavePublica);

      let suscripcion = await registro.pushManager.getSubscription();
      // Si la API cambió de claves, la suscripción vieja ya no sirve: se renueva.
      if (suscripcion && !mismaClave(suscripcion.options.applicationServerKey, claveServidor)) {
        await suscripcion.unsubscribe();
        suscripcion = null;
      }
      suscripcion ??= await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveServidor,
      });

      await firstValueFrom(this.api.post<void>(`Notificaciones/pedidos/${pedidoId}`, suscripcion.toJSON()));
      try {
        localStorage.setItem(clave(pedidoId), '1');
      } catch {
        // Sin almacenamiento: los avisos funcionan igual, solo que el botón vuelve a aparecer al recargar.
      }
      return 'activo';
    } catch {
      return 'error';
    }
  }
}

export function base64UrlABytes(texto: string): Uint8Array<ArrayBuffer> {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(texto.length / 4) * 4, '=');
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function mismaClave(actual: ArrayBuffer | null, esperada: Uint8Array): boolean {
  if (!actual) return false;
  const a = new Uint8Array(actual);
  return a.length === esperada.length && a.every((b, i) => b === esperada[i]);
}
