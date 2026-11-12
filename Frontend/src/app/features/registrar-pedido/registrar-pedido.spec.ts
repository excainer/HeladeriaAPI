import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from '../../core/interceptors/error';
import { CarritoService } from '../../core/services/carrito';
import { RegistrarPedido } from './registrar-pedido';

registerLocaleData(localeEsCo);

describe('RegistrarPedido', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'es-CO' }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function crear() {
    const f = TestBed.createComponent(RegistrarPedido);
    http.expectOne('/api/Mesas').flush([{ mesaId: 2, numero: 2, estado: 'Disponible' }, { mesaId: 1, numero: 1, estado: 'Disponible' }]);
    await f.whenStable();
    http.expectOne('/api/Categorias').flush([{ categoriaId: 3, nombre: 'Postres' }]);
    http.expectOne('/api/Productos').flush([{ productoId: 6, categoriaId: 3, nombre: 'Brownie', precio: 7000, activo: true }]);
    http.expectOne('/api/Tamanos').flush([]);
    http.expectOne('/api/Opciones').flush([]);
    await f.whenStable();
    return f;
  }

  const boton = (el: HTMLElement, texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.trim().startsWith(texto))!;

  it('usa el menú sin título ni barra de "Ver pedido", y ofrece mostrador y mesas', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    expect(el.querySelector('app-menu h1')).toBeNull();
    expect(el.querySelector('.barra-pedido')).toBeNull();
    const opciones = Array.from(el.querySelectorAll('select option')).map((o) => o.textContent!.trim());
    expect(opciones).toEqual(['Mostrador (para llevar)', 'Mesa 1', 'Mesa 2']);
    expect(boton(el, 'Registrar pedido').disabled).toBe(true);
  });

  it('registra un pedido de mostrador (para llevar) y vacía el carrito del personal', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Agregar').click();
    boton(el, 'Agregar').click();
    await f.whenStable();
    expect(el.querySelector('.resumen')!.textContent).toContain('$14.000');

    boton(el, 'Registrar pedido').click();
    const req = http.expectOne('/api/Pedidos/personal');
    expect(req.request.body).toEqual({ mesaId: null, paraLlevar: true, detalles: [expect.objectContaining({ productoId: 6, cantidad: 2 })] });
    req.flush({ pedidoId: 40, mesaId: null, fecha: '', estado: 'Pendiente', total: 14000, registradoPor: 'Juan Silva' });
    await f.whenStable();
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('Pedido #40 registrado en mostrador (para llevar)');
    expect(el.querySelector('.vacio')).toBeTruthy();
  });

  it('registra para una mesa', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Agregar').click();
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    await f.whenStable();
    boton(el, 'Registrar pedido').click();
    const req = http.expectOne('/api/Pedidos/personal');
    expect(req.request.body.mesaId).toBe(2);
    expect(req.request.body.paraLlevar).toBe(false);
    req.flush({ pedidoId: 41, mesaId: 2, fecha: '', estado: 'Pendiente', total: 7000 });
    await f.whenStable();
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('para la mesa 2');
  });

  it('su carrito no se mezcla con el del cliente', async () => {
    const f = await crear();
    boton(f.nativeElement, 'Agregar').click();
    await f.whenStable();
    expect(TestBed.inject(CarritoService).lineas()).toEqual([]); // el carrito del cliente sigue vacío
    expect(sessionStorage.getItem('heladapp.carrito.personal')).toContain('Brownie');
    expect(sessionStorage.getItem('heladapp.carrito')).toBeNull();
  });

  it('muestra el error de la API y conserva el pedido', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Agregar').click();
    await f.whenStable();
    boton(el, 'Registrar pedido').click();
    http.expectOne('/api/Pedidos/personal').flush('El producto "Brownie" no está disponible.', { status: 400, statusText: 'Bad Request' });
    await f.whenStable();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('no está disponible');
    expect(el.querySelector('.lineas')).toBeTruthy();
  });

  it('con mesa se puede marcar "Para llevar"', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.resumen input[type=checkbox]')).toBeNull(); // en mostrador no hace falta
    boton(el, 'Agregar').click();
    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    await f.whenStable();
    const casilla = el.querySelector('.resumen input[type=checkbox]') as HTMLInputElement;
    casilla.checked = true;
    casilla.dispatchEvent(new Event('change'));
    boton(el, 'Registrar pedido').click();
    const req = http.expectOne('/api/Pedidos/personal');
    expect(req.request.body).toEqual(expect.objectContaining({ mesaId: 1, paraLlevar: true }));
    req.flush({ pedidoId: 42, mesaId: 1, fecha: '', estado: 'Pendiente', total: 7000, paraLlevar: true });
    await f.whenStable();
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('para la mesa 1 (para llevar)');
  });
});
