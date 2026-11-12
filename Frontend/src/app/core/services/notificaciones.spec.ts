import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificacionesService, base64UrlABytes } from './notificaciones';

/** Ventana falsa con lo justo para simular un navegador con (o sin) notificaciones push. */
function ventanaFalsa(opciones: { push?: boolean; permiso?: NotificationPermission; agente?: string; instalada?: boolean } = {}) {
  const suscripcion = {
    options: { applicationServerKey: null as ArrayBuffer | null },
    toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn(),
  };
  const registro = {
    pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn(async (_opciones: PushSubscriptionOptionsInit) => suscripcion) },
  };
  const Notification = {
    permission: opciones.permiso ?? 'default',
    requestPermission: vi.fn(async () => 'granted' as NotificationPermission),
  };
  const ventana: Record<string, unknown> = {
    isSecureContext: true,
    navigator: {
      userAgent: opciones.agente ?? 'Mozilla/5.0 (Linux; Android 14) Chrome/130',
      platform: 'Linux',
      maxTouchPoints: 5,
      ...(opciones.push === false ? {} : {
        serviceWorker: { register: vi.fn(async () => registro), ready: Promise.resolve(registro) },
      }),
    },
    matchMedia: () => ({ matches: opciones.instalada ?? false }),
  };
  if (opciones.push !== false) {
    ventana['PushManager'] = class {};
    ventana['Notification'] = Notification;
  }
  return { ventana, registro, Notification };
}

function crear(ventana: Record<string, unknown>) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: DOCUMENT, useValue: { defaultView: ventana } },
    ],
  });
  return TestBed.inject(NotificacionesService);
}

describe('NotificacionesService', () => {
  // Almacenamiento en memoria (Node no siempre trae localStorage en las pruebas).
  beforeEach(() => {
    const datos = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => datos.set(k, v),
      removeItem: (k: string) => datos.delete(k),
      clear: () => datos.clear(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('convierte una clave base64url a bytes', () => {
    expect(Array.from(base64UrlABytes('AQID_-8'))).toEqual([1, 2, 3, 255, 239]);
  });

  it('dice que no hay soporte si el navegador no tiene push', () => {
    expect(crear(ventanaFalsa({ push: false }).ventana).soporte()).toBe('no-soportado');
  });

  it('en iPhone sin instalar pide agregar la app a la pantalla de inicio', () => {
    const { ventana } = ventanaFalsa({ push: false, agente: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' });
    expect(crear(ventana).soporte()).toBe('requiere-instalar');
  });

  it('detecta el permiso bloqueado', () => {
    expect(crear(ventanaFalsa({ permiso: 'denied' }).ventana).soporte()).toBe('bloqueado');
  });

  it('activa: pide permiso, se suscribe con la clave de la API y la registra para el pedido', async () => {
    const { ventana, registro, Notification } = ventanaFalsa();
    const servicio = crear(ventana);
    const http = TestBed.inject(HttpTestingController);

    const resultado = servicio.activar(12);
    await vi.waitFor(() => http.expectOne('/api/Notificaciones/clave-publica').flush({ clavePublica: 'AQID' }));
    await vi.waitFor(() => {
      const req = http.expectOne('/api/Notificaciones/pedidos/12');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.endpoint).toContain('fcm.googleapis.com');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    expect(await resultado).toBe('activo');
    expect(Notification.requestPermission).toHaveBeenCalled();
    expect(Array.from(registro.pushManager.subscribe.mock.calls[0]![0].applicationServerKey as Uint8Array)).toEqual([1, 2, 3]);
    Notification.permission = 'granted';
    expect(servicio.activos(12)).toBe(true);
    expect(servicio.activos(13)).toBe(false);
  });

  it('si la persona niega el permiso no se suscribe', async () => {
    const { ventana, registro, Notification } = ventanaFalsa();
    Notification.requestPermission.mockResolvedValue('denied');
    expect(await crear(ventana).activar(12)).toBe('bloqueado');
    expect(registro.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('si la API rechaza la suscripción devuelve error', async () => {
    const { ventana } = ventanaFalsa();
    const servicio = crear(ventana);
    const http = TestBed.inject(HttpTestingController);
    const resultado = servicio.activar(12);
    await vi.waitFor(() => http.expectOne('/api/Notificaciones/clave-publica').flush({ clavePublica: 'AQID' }));
    await vi.waitFor(() => http.expectOne('/api/Notificaciones/pedidos/12')
      .flush('El pedido ya está "Listo"', { status: 409, statusText: 'Conflict' }));
    expect(await resultado).toBe('error');
  });
});
