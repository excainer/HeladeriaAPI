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
});
