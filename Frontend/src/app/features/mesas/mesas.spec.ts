import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../../core/interceptors/error';
import { Mesas } from './mesas';

describe('Mesas', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => vi.useRealTimers());

  async function crear() {
    const f = TestBed.createComponent(Mesas);
    await vi.advanceTimersByTimeAsync(0);
    return f;
  }
  const textos = (el: HTMLElement) =>
    Array.from<HTMLElement>(el.querySelectorAll('.mesa')).map((m) => m.textContent!.replace(/\s+/g, ' ').trim());

  it('lista las mesas por número y marca las ocupadas con sus pedidos en curso', async () => {
    const f = await crear();
    http.expectOne('/api/Mesas').flush([
      { mesaId: 2, numero: 2, estado: 'Disponible', pedidosActivos: 0 },
      { mesaId: 1, numero: 1, estado: 'Ocupada', pedidosActivos: 2 },
    ]);
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    const el: HTMLElement = f.nativeElement;
    expect(textos(el)).toEqual(['Mesa 1Ocupada2 pedidos en curso', 'Mesa 2Disponible']);
    expect(el.querySelectorAll('.mesa--ocupada').length).toBe(1);
    expect(el.querySelector('.resumen')!.textContent).toContain('1 de 2 ocupadas');
  });

  it('se actualiza sola cada 5 segundos (la mesa se ocupa al llegar un pedido)', async () => {
    const f = await crear();
    http.expectOne('/api/Mesas').flush([{ mesaId: 3, numero: 3, estado: 'Disponible', pedidosActivos: 0 }]);
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(textos(f.nativeElement)).toEqual(['Mesa 3Disponible']);
    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Mesas').flush([{ mesaId: 3, numero: 3, estado: 'Ocupada', pedidosActivos: 1 }]);
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(textos(f.nativeElement)).toEqual(['Mesa 3Ocupada1 pedido en curso']);
  });

  it('muestra el error y permite reintentar', async () => {
    const f = await crear();
    http.expectOne('/api/Mesas').flush('x', { status: 500, statusText: 'Error' });
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    (f.nativeElement.querySelector('[role=alert] button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/Mesas').flush([{ mesaId: 1, numero: 1, estado: 'Disponible', pedidosActivos: 0 }]);
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
  });

  it('muestra "Liberar mesa" solo cuando todo está entregado y la libera', async () => {
    const f = await crear();
    http.expectOne('/api/Mesas').flush([
      { mesaId: 1, numero: 1, estado: 'Ocupada', pedidosActivos: 1, pedidosDesdeLiberacion: 1, puedeLiberarse: false },
      { mesaId: 2, numero: 2, estado: 'Ocupada', pedidosActivos: 0, pedidosDesdeLiberacion: 2, puedeLiberarse: true },
    ]);
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    const el: HTMLElement = f.nativeElement;
    const botones = el.querySelectorAll<HTMLButtonElement>('.liberar');
    expect(botones.length).toBe(1);
    expect(botones[0].getAttribute('aria-label')).toBe('Liberar mesa 2');
    expect(textos(el)[1]).toContain('Todo entregado');

    botones[0].click();
    const req = http.expectOne('/api/Mesas/2/liberar');
    expect(req.request.method).toBe('POST');
    req.flush({ mesaId: 2, numero: 2, estado: 'Disponible', pedidosActivos: 0, pedidosDesdeLiberacion: 0, puedeLiberarse: false });
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(textos(el)[1]).toBe('Mesa 2Disponible');
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('Mesa 2 liberada');
  });

  it('si la API no deja liberar (pedido nuevo), muestra el motivo y recarga', async () => {
    const f = await crear();
    http.expectOne('/api/Mesas').flush([{ mesaId: 2, numero: 2, estado: 'Ocupada', pedidosActivos: 0, pedidosDesdeLiberacion: 1, puedeLiberarse: true }]);
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    (f.nativeElement.querySelector('.liberar') as HTMLButtonElement).click();
    http.expectOne('/api/Mesas/2/liberar').flush('La mesa 2 tiene 1 pedido sin entregar. Entrégalos antes de liberarla.', { status: 409, statusText: 'Conflict' });
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.querySelector('.mensaje-error').textContent).toContain('sin entregar');
    http.expectOne('/api/Mesas'); // recarga el estado real
  });
});

