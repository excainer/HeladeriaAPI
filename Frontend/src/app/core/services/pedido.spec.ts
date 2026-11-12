import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PedidoService } from './pedido';
import { NuevoPedido } from '../models/nuevo-pedido.model';

describe('PedidoService', () => {
  let service: PedidoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PedidoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('filtra por estado codificando el espacio de "En Preparacion"', () => {
    service.obtenerPorEstado('En Preparacion').subscribe();
    http.expectOne('/api/Pedidos/estado/En%20Preparacion').flush([]);
  });

  it('consulta los pedidos de una mesa', () => {
    service.obtenerPorMesa(3).subscribe();
    http.expectOne('/api/Pedidos/mesa/3').flush([]);
  });

  it('consulta los detalles de un pedido', () => {
    service.obtenerDetalles(7).subscribe();
    http.expectOne('/api/Pedidos/7/detalles').flush([]);
  });

  it('crea un pedido con POST y el cuerpo que espera la API', () => {
    const pedido: NuevoPedido = {
      mesaId: 1,
      detalles: [{ productoId: 2, cantidad: 1, sabores: 'Chocolate' }],
    };
    service.crear(pedido).subscribe();
    const req = http.expectOne('/api/Pedidos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(pedido);
    req.flush({});
  });

  it('actualiza el estado con PUT y { estado }', () => {
    service.actualizarEstado(5, 'Listo').subscribe();
    const req = http.expectOne('/api/Pedidos/5/estado');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ estado: 'Listo' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
