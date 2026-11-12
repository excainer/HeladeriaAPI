import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { errorInterceptor } from '../../core/interceptors/error';

registerLocaleData(localeEsCo);

const configurar = () => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'es-CO' }],
  });
  return TestBed.inject(HttpTestingController);
};

import { Pedidos } from './pedidos';

const pedidos = [
  { pedidoId: 1, mesaId: 1, fecha: '2026-11-07T10:00:00', estado: 'Pendiente', total: 5000 },
  { pedidoId: 2, mesaId: 2, fecha: '2026-11-07T11:00:00', estado: 'Entregado', total: 9000 },
  { pedidoId: 3, mesaId: 1, fecha: '2026-11-07T12:00:00', estado: 'Entregado', total: 7000 },
];

describe('Pedidos', () => {
  async function crear() {
    const http = configurar();
    const f = TestBed.createComponent(Pedidos);
    http.expectOne('/api/Pedidos').flush(pedidos);
    http.expectOne('/api/Mesas').flush([{ mesaId: 1, numero: 1, estado: 'x' }, { mesaId: 2, numero: 2, estado: 'x' }]);
    http.expectOne('/api/Productos').flush([{ productoId: 1, categoriaId: 1, nombre: 'Brownie', precio: 7000, activo: true }]);
    await f.whenStable();
    return { f, http, el: f.nativeElement as HTMLElement };
  }
  const click = (el: HTMLElement, texto: string) =>
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.trim() === texto) as HTMLButtonElement).click();

  it('lista todos los pedidos', async () => {
    const { el } = await crear();
    expect(el.querySelectorAll('.pedido').length).toBe(3);
    expect(el.textContent).toContain('$5.000');
  });

  it('filtra por estado', async () => {
    const { f, el } = await crear();
    click(el, 'Entregado');
    await f.whenStable();
    expect(el.querySelectorAll('.pedido').length).toBe(2);
    click(el, 'Todos');
    await f.whenStable();
    expect(el.querySelectorAll('.pedido').length).toBe(3);
  });

  it('filtra por mesa y combina con el estado', async () => {
    const { f, el } = await crear();
    const sel = el.querySelector('select') as HTMLSelectElement;
    sel.value = '1';
    sel.dispatchEvent(new Event('change'));
    await f.whenStable();
    expect(el.querySelectorAll('.pedido').length).toBe(2);
    click(el, 'Entregado');
    await f.whenStable();
    expect(el.querySelectorAll('.pedido').length).toBe(1);
  });

  it('avisa si no hay resultados', async () => {
    const { f, el } = await crear();
    click(el, 'Listo');
    await f.whenStable();
    expect(el.textContent).toContain('No hay pedidos con estos filtros.');
  });

  it('carga el detalle solo al abrirlo', async () => {
    const { f, http, el } = await crear();
    http.expectNone('/api/Pedidos/1/detalles');
    click(el, 'Ver detalle'); // primer pedido de la lista
    http.expectOne('/api/Pedidos/1/detalles').flush([
      { detallePedidoId: 1, pedidoId: 1, productoId: 1, cantidad: 2, observaciones: 'Sin crema', precioUnitario: 7000 },
    ]);
    await f.whenStable();
    expect(el.querySelector('.detalle')!.textContent).toContain('2 × Brownie');
    expect(el.querySelector('.detalle')!.textContent).toContain('Sin crema');
  });

  it('distingue mostrador, para llevar y quién los registró, y filtra los para llevar', async () => {
    const http = configurar();
    const f = TestBed.createComponent(Pedidos);
    http.expectOne('/api/Pedidos').flush([
      { pedidoId: 30, mesaId: null, fecha: '2026-11-12T10:00:00', estado: 'Pendiente', total: 7000, paraLlevar: true, registradoPorId: 7, registradoPor: 'Juan Silva' },
      { pedidoId: 32, mesaId: 1, fecha: '2026-11-12T10:10:00', estado: 'Pendiente', total: 7000, paraLlevar: true, registradoPorId: null, registradoPor: null },
      { pedidoId: 31, mesaId: 1, fecha: '2026-11-12T10:05:00', estado: 'Pendiente', total: 5000, registradoPorId: null, registradoPor: null },
    ]);
    http.expectOne('/api/Mesas').flush([{ mesaId: 1, numero: 1, estado: 'x' }]);
    http.expectOne('/api/Productos').flush([]);
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    const filas = () => Array.from(el.querySelectorAll('.pedido__fila')).map((r) => r.textContent!.replace(/\s+/g, ' '));
    expect(filas()[0]).toContain('Mostrador · 🥡 Para llevar');
    expect(filas().find((f) => f.includes('Pedido 32'))).toContain('Mesa 1 · 🥡 Para llevar'); // pedido para llevar hecho desde la mesa
    expect(filas()[0]).toContain('Registrado por Juan Silva');
    expect(filas().find((f) => f.includes('Pedido 31'))).toContain('Desde la mesa');
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'llevar';
    select.dispatchEvent(new Event('change'));
    await f.whenStable();
    expect(filas().length).toBe(2); // el de mostrador y el de la mesa 1
    expect(filas().every((f) => f.includes('Para llevar'))).toBe(true);
  });
});
