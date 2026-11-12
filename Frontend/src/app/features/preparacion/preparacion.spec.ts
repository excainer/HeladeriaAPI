import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Preparacion } from './preparacion';
import { errorInterceptor } from '../../core/interceptors/error';
import { Title } from '@angular/platform-browser';
import { SonidoService } from '../../core/services/sonido';

const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const pedidos = [
  { pedidoId: 12, mesaId: 3, fecha: hace(6), estado: 'Pendiente', total: 5000 },
  { pedidoId: 13, mesaId: 1, fecha: hace(2), estado: 'Pendiente', total: 11000 },
  { pedidoId: 11, mesaId: 5, fecha: hace(9), estado: 'En Preparacion', total: 12000 },
  { pedidoId: 9, mesaId: 2, fecha: hace(50), estado: 'Entregado', total: 9000 },
];

describe('Preparacion', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => vi.useRealTimers());

  const asentar = async () => { await vi.advanceTimersByTimeAsync(0); TestBed.tick(); };

  async function crear() {
    const f = TestBed.createComponent(Preparacion);
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/Productos').flush([{ productoId: 1, categoriaId: 1, nombre: 'Helado de Vainilla', precio: 5000, activo: true }]);
    http.expectOne('/api/Mesas').flush([
      { mesaId: 1, numero: 1, estado: 'x' }, { mesaId: 3, numero: 3, estado: 'x' }, { mesaId: 5, numero: 5, estado: 'x' },
    ]);
    http.expectOne('/api/Pedidos').flush(pedidos);
    await vi.advanceTimersByTimeAsync(0);
    for (const id of [12, 13, 11]) {
      http.expectOne(`/api/Pedidos/${id}/detalles`).flush([
        { detallePedidoId: id, pedidoId: id, productoId: 1, cantidad: 2, sabores: 'Fresa', observaciones: 'Sin crema', precioUnitario: 5000 },
      ]);
    }
    await asentar();
    return f;
  }

  it('agrupa por estado, oculta entregados y ordena por antigüedad', async () => {
    const f = await crear();
    const cols = Array.from<HTMLElement>(f.nativeElement.querySelectorAll('.columna'));
    expect(cols.length).toBe(3);
    expect(cols[0].querySelector('.contador')!.textContent).toBe('2');
    const mesas = Array.from(cols[0].querySelectorAll('.pedido__mesa')).map((e) => e.textContent);
    expect(mesas).toEqual(['Mesa 3', 'Mesa 1']); // el pedido de hace 6 min va primero
    expect(cols[2].textContent).toContain('Sin pedidos');
    expect(f.nativeElement.textContent).not.toContain('Pedido 9');
  });

  it('muestra los ítems con nombre, sabores y notas', async () => {
    const f = await crear();
    const t: string = f.nativeElement.textContent;
    expect(t).toContain('2 × Helado de Vainilla');
    expect(t).toContain('Sabores: Fresa');
    expect(t).toContain('Sin crema');
  });

  it('avanza el estado con el nombre exacto que acepta la API', async () => {
    const f = await crear();
    const boton = f.nativeElement.querySelector('.Pendiente .pedido .boton') as HTMLButtonElement;
    expect(boton.textContent).toContain('Empezar a preparar');
    boton.click();
    const req = http.expectOne('/api/Pedidos/12/estado');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'En Preparacion' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await asentar();
    // se vuelve a consultar de inmediato, sin esperar 5 s
    http.expectOne('/api/Pedidos').flush(pedidos.map((p) => (p.pedidoId === 12 ? { ...p, estado: 'En Preparacion' } : p)));
    await asentar();
    expect(f.nativeElement.querySelectorAll('.EnPreparacion .pedido').length).toBe(2);
    http.expectNone((r) => r.url.includes('detalles')); // los ítems ya conocidos no se piden otra vez
  });

  it('muestra el error si el cambio falla y no mueve el pedido', async () => {
    const f = await crear();
    (f.nativeElement.querySelector('.Pendiente .pedido .boton') as HTMLButtonElement).click();
    http.expectOne('/api/Pedidos/12/estado').flush('Estado no válido. Valores permitidos: x.', { status: 400, statusText: 'Bad Request' });
    await asentar();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(f.nativeElement.querySelectorAll('.Pendiente .pedido').length).toBe(2);
  });

  it('vuelve a consultar cada 5 segundos y tolera un fallo', async () => {
    const f = await crear();
    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos').flush('x', { status: 500, statusText: 'Error' });
    await asentar();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(f.nativeElement.querySelectorAll('.pedido').length).toBe(3); // conserva lo último
    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos').flush(pedidos);
    await asentar();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
  });

  it('suena y avisa en el título cuando llega un pedido nuevo (no al abrir)', async () => {
    const sonido = TestBed.inject(SonidoService);
    const ding = vi.spyOn(sonido, 'nuevoPedido');
    const f = await crear();
    expect(ding).not.toHaveBeenCalled(); // los pedidos que ya estaban no suenan

    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos').flush([...pedidos, { pedidoId: 14, mesaId: 1, fecha: hace(0), estado: 'Pendiente', total: 5000 }]);
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/Pedidos/14/detalles').flush([]);
    await asentar();

    expect(ding).toHaveBeenCalledTimes(1);
    expect(f.nativeElement.querySelector('.nuevos').textContent).toContain('Llegó 1 pedido nuevo');
    expect(f.nativeElement.querySelectorAll('.pedido--nuevo').length).toBe(1);
    expect(TestBed.inject(Title).getTitle()).toContain('🔔 (1)');

    // Al tocar la pantalla se da por visto.
    document.dispatchEvent(new Event('pointerdown'));
    await asentar();
    expect(f.nativeElement.querySelector('.nuevos')).toBeNull();
    expect(TestBed.inject(Title).getTitle()).toBe('Cocina · HeladApp');
  });

  it('el botón de sonido permite silenciar', async () => {
    const f = await crear();
    const sonido = TestBed.inject(SonidoService);
    const antes = sonido.silenciado();
    (f.nativeElement.querySelector('.sonido') as HTMLButtonElement).click();
    expect(sonido.silenciado()).toBe(!antes);
    sonido.alternarSilencio(); // deja el estado como estaba para las demás pruebas
  });

  it('cancela un pedido pendiente después de confirmar', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    const pendientes = el.querySelectorAll('.columna')[0];
    expect(el.querySelectorAll('.columna')[1].querySelector('.cancelar')).toBeNull(); // en preparación no se cancela
    (pendientes.querySelector('.cancelar') as HTMLButtonElement).click();
    await asentar();
    expect(el.querySelector('.confirmar')!.textContent).toContain('¿Cancelar el pedido 12 (Mesa 3)?');
    const si = Array.from(el.querySelectorAll<HTMLButtonElement>('.confirmar button')).find((b) => b.textContent!.includes('Sí'))!;
    si.click();
    const req = http.expectOne('/api/Pedidos/12/cancelar');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/Pedidos').flush(pedidos.map((p) => (p.pedidoId === 12 ? { ...p, estado: 'Cancelado' } : p)));
    await asentar();
    expect(el.textContent).not.toContain('Pedido 12');
  });

  it('si la cocina ya empezó, muestra por qué no se pudo cancelar', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    (el.querySelector('.cancelar') as HTMLButtonElement).click();
    await asentar();
    Array.from(el.querySelectorAll<HTMLButtonElement>('.confirmar button')).find((b) => b.textContent!.includes('Sí'))!.click();
    http.expectOne('/api/Pedidos/12/cancelar').flush('Solo se pueden cancelar pedidos pendientes: la cocina ya empezó a prepararlo.', { status: 409, statusText: 'Conflict' });
    await asentar();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('ya empezó');
  });

  it('muestra "Mostrador", la etiqueta de para llevar y quién registró el pedido', async () => {
    const f = await crear();
    await vi.advanceTimersByTimeAsync(5000);
    http.expectOne('/api/Pedidos').flush([...pedidos, { pedidoId: 20, mesaId: null, fecha: hace(0), estado: 'Pendiente', total: 7000, paraLlevar: true, registradoPorId: 7, registradoPor: 'Juan Silva' }]);
    await vi.advanceTimersByTimeAsync(0);
    http.expectOne('/api/Pedidos/20/detalles').flush([]);
    await asentar();
    const tarjeta = Array.from<HTMLElement>(f.nativeElement.querySelectorAll('.pedido')).find((e) => e.textContent!.includes('Pedido 20'))!;
    expect(tarjeta.querySelector('.pedido__mesa')!.textContent).toContain('Mostrador');
    expect(tarjeta.querySelector('.llevar')!.textContent).toContain('Para llevar');
    expect(tarjeta.textContent).toContain('por Juan Silva');
  });
});
