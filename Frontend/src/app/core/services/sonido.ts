import { DOCUMENT, Injectable, inject, signal } from '@angular/core';

const CLAVE_SILENCIO = 'heladapp.cocina.silencio';

/**
 * Sonidos y vibración, generados en el navegador (sin archivos de audio).
 * Los navegadores solo dejan sonar audio después de que la persona toca la página,
 * así que el audio se "desbloquea" con el primer toque o tecla en cualquier parte de la app.
 */
@Injectable({
  providedIn: 'root',
})
export class SonidoService {
  private readonly documento = inject(DOCUMENT);
  private contexto: AudioContext | null = null;

  /** Si el audio ya quedó habilitado por un toque de la persona. */
  readonly habilitado = signal(false);

  /** Silencio de la cocina (se recuerda en este navegador). */
  readonly silenciado = signal(this.leerSilencio());

  constructor() {
    const ventana = this.documento.defaultView;
    if (!ventana) return;
    const desbloquear = () => {
      this.desbloquear();
      if (this.habilitado()) {
        ventana.removeEventListener('pointerdown', desbloquear, true);
        ventana.removeEventListener('keydown', desbloquear, true);
      }
    };
    ventana.addEventListener('pointerdown', desbloquear, true);
    ventana.addEventListener('keydown', desbloquear, true);
  }

  /** Crea o reanuda el audio. Debe llamarse dentro de un toque o clic de la persona. */
  desbloquear() {
    const Contexto = this.documento.defaultView?.AudioContext;
    if (!Contexto) return;
    try {
      this.contexto ??= new Contexto();
      if (this.contexto.state === 'suspended') void this.contexto.resume();
      // Un sonido mudo y corto termina de habilitar el audio en iPhone.
      this.tono(0, 0.01, 0, 0);
      this.habilitado.set(true);
    } catch {
      // Sin audio disponible: la app sigue funcionando sin sonidos.
    }
  }

  alternarSilencio() {
    this.silenciado.update((s) => !s);
    try {
      localStorage.setItem(CLAVE_SILENCIO, this.silenciado() ? '1' : '0');
    } catch {
      // Sin almacenamiento: el silencio dura hasta recargar.
    }
  }

  /** "Ding-dong" para la cocina: llegó un pedido. Respeta el silencio de la cocina. */
  nuevoPedido() {
    if (this.silenciado()) return;
    this.tono(880, 0.18, 0, 0.35);
    this.tono(660, 0.28, 0.2, 0.35);
  }

  /** Tres notas ascendentes para el cliente: su pedido está listo. */
  pedidoListo() {
    this.tono(523, 0.16, 0, 0.3);
    this.tono(659, 0.16, 0.17, 0.3);
    this.tono(784, 0.32, 0.34, 0.3);
  }

  /** Vibración del celular (Android; iPhone no lo permite desde una página web). */
  vibrar(patron: number[] = [250, 120, 250]) {
    try {
      this.documento.defaultView?.navigator.vibrate?.(patron);
    } catch {
      // No disponible.
    }
  }

  private tono(frecuencia: number, duracion: number, retraso: number, volumen: number) {
    const ctx = this.contexto;
    if (!ctx || ctx.state === 'closed') return;
    const inicio = ctx.currentTime + retraso;
    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();
    oscilador.type = 'sine';
    oscilador.frequency.value = frecuencia || 440;
    ganancia.gain.setValueAtTime(0.0001, inicio);
    ganancia.gain.exponentialRampToValueAtTime(Math.max(volumen, 0.0001), inicio + 0.02);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);
    oscilador.connect(ganancia).connect(ctx.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion + 0.05);
  }

  private leerSilencio(): boolean {
    try {
      return localStorage.getItem(CLAVE_SILENCIO) === '1';
    } catch {
      return false;
    }
  }
}
