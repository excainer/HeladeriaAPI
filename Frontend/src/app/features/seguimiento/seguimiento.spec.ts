import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Seguimiento } from './seguimiento';
import { Title } from '@angular/platform-browser';
import { SonidoService } from '../../core/services/sonido';
import { MesaSesionService } from '../../core/services/mesa-sesion';

registerLocaleData(localeEsCo);

const pedido = (estado: string, mesaId = 3) => ({ pedidoId: 12, mesaId, fecha: '', estado, total: 7000 });

describe('Seguimiento', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: LOCALE_ID, useValue: 'es-CO' },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '12']]) } } },
      ],
    });
    TestBed.inject(MesaSesionService).establecer({ mesaId: 3, numero: 3, estado: 'Disponible' });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => vi.useRealTimers());

  async function crear() {
    const f = TestBed.createComponent(Seguimiento);
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/Pedidos/12/detalles').flush([
      { detallePedidoId: 1, pedidoId: 12, productoId: 6, cantidad: 2, sabores: 'Fresa', precioUnitario: 7000 },
    ]);
    http.expectOne('/api/Productos').flush([{ productoId: 6, categoriaId: 3, nombre: 'Brownie', precio: 7000, activo: true }]);
    return f;
  }

  it('muestra el estado y los ítems con nombre', async () => {
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('Pendiente'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    const t: string = f.nativeElement.textContent;
    expect(t).toContain('Tu pedido #12');
    expect(t).toContain('Recibimos tu pedido');
    expect(t).toContain('2 × Brownie');
    expect(t).toContain('$7.000');
  });

  it('se actualiza cada 5 segundos y avisa cuando está listo', async () => {
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('En Preparacion'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.textContent).toContain('Estamos preparando');
    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos/12').flush(pedido('Listo'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('¡Tu pedido está listo!');
  });

  it('deja de consultar cuando se entrega', async () => {
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('Entregado'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    await vi.advanceTimersByTimeAsync(15000);
    http.expectNone('/api/Pedidos/12');
  });

  it('conserva lo último y avisa si falla una actualización', async () => {
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('Pendiente'));
    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos/12').flush('x', { status: 500, statusText: 'Error' });
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.textContent).toContain('Tu pedido #12');
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
  });

  it('no muestra pedidos de otra mesa', async () => {
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('Pendiente', 9));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.textContent).toContain('No encontramos este pedido');
  });

  it('avisa con sonido, vibración y título cuando el pedido pasa a Listo', async () => {
    const sonido = TestBed.inject(SonidoService);
    const musica = vi.spyOn(sonido, 'pedidoListo');
    const vibrar = vi.spyOn(sonido, 'vibrar');
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('En Preparacion'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(musica).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos/12').flush(pedido('Listo'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(musica).toHaveBeenCalledTimes(1);
    expect(vibrar).toHaveBeenCalled();
    expect(f.nativeElement.querySelector('.listo').textContent).toContain('¡Tu pedido está listo!');
    expect(TestBed.inject(Title).getTitle()).toContain('listo');

    (f.nativeElement.querySelector('.listo button') as HTMLButtonElement).click();
    TestBed.tick();
    expect(f.nativeElement.querySelector('.listo')).toBeNull();
  });

  it('no suena si el pedido ya estaba listo al abrir la página', async () => {
    const musica = vi.spyOn(TestBed.inject(SonidoService), 'pedidoListo');
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('Listo'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(musica).not.toHaveBeenCalled();
    expect(f.nativeElement.querySelector('.listo')).toBeNull();
  });

  it('muestra un pedido cancelado y deja de consultar', async () => {
    const f = await crear();
    http.expectOne('/api/Pedidos/12').flush(pedido('Cancelado'));
    await vi.advanceTimersByTimeAsync(0); TestBed.tick();
    expect(f.nativeElement.textContent).toContain('Tu pedido fue cancelado');
    expect(f.nativeElement.querySelector('.pasos')).toBeNull();
    await vi.advanceTimersByTimeAsync(10000);
    http.expectNone('/api/Pedidos/12');
  });
});
