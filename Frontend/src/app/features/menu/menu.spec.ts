import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { provideRouter } from '@angular/router';
import { Menu } from './menu';
import { CarritoService } from '../../core/services/carrito';

registerLocaleData(localeEsCo);

const categorias = [
  { categoriaId: 1, nombre: 'Helados' },
  { categoriaId: 2, nombre: 'Bebidas' },
  { categoriaId: 3, nombre: 'Vacía' },
  { categoriaId: 4, nombre: 'Toppings' },
];
const productos = [
  { productoId: 1, categoriaId: 1, nombre: 'Helado de Vainilla', precio: 5000, activo: true },
  { productoId: 2, categoriaId: 1, nombre: 'Helado agotado', precio: 5000, activo: false },
  { productoId: 4, categoriaId: 2, nombre: 'Jugo Natural', precio: 6000, activo: true },
  { productoId: 7, categoriaId: 4, nombre: 'Maní', precio: 1000, activo: true },
];
const tamanos = [
  { tamanoId: 2, categoriaId: 1, nombre: 'Grande', precioAdicional: 3000, orden: 2, activo: true },
  { tamanoId: 1, categoriaId: 1, nombre: 'Pequeño', precioAdicional: 0, orden: 1, activo: true },
  { tamanoId: 3, categoriaId: 1, nombre: 'Gigante', precioAdicional: 9000, orden: 3, activo: false },
];
const opciones = [
  { opcionId: 3, categoriaId: 1, tipo: 'Sabor', nombre: 'Fresa', orden: 2, activo: true },
  { opcionId: 1, categoriaId: 1, tipo: 'Sabor', nombre: 'Vainilla', orden: 1, activo: true },
  { opcionId: 4, categoriaId: 1, tipo: 'Sabor', nombre: 'Mango', orden: 3, activo: false },
  { opcionId: 5, categoriaId: 1, tipo: 'Topping', nombre: 'Maní', orden: 1, activo: true },
];

describe('Menu', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: LOCALE_ID, useValue: 'es-CO' }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function crear() {
    const f = TestBed.createComponent(Menu);
    http.expectOne('/api/Categorias').flush(categorias);
    http.expectOne('/api/Productos').flush(productos);
    http.expectOne('/api/Tamanos').flush(tamanos);
    http.expectOne('/api/Opciones').flush(opciones);
    await f.whenStable();
    return f;
  }

  const textoBotones = (el: HTMLElement) => Array.from(el.querySelectorAll('button')).map((b) => b.textContent!.trim());
  const click = (el: HTMLElement, texto: string) =>
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.trim().startsWith(texto)) as HTMLButtonElement).click();

  it('muestra solo categorías con productos y oculta Toppings', async () => {
    const f = await crear();
    const nav = f.nativeElement.querySelector('nav') as HTMLElement;
    expect(textoBotones(nav)).toEqual(['Helados', 'Bebidas']);
  });

  it('oculta productos inactivos y muestra precios con formato', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    expect(el.textContent).toContain('Helado de Vainilla');
    expect(el.textContent).toContain('$5.000');
    expect(el.textContent).not.toContain('agotado');
  });

  it('cambia de categoría', async () => {
    const f = await crear();
    click(f.nativeElement, 'Bebidas');
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Jugo Natural');
    expect(f.nativeElement.textContent).not.toContain('Helado de Vainilla');
  });

  it('agrega directo al carrito un producto sin tamaños', async () => {
    const f = await crear();
    click(f.nativeElement, 'Bebidas');
    await f.whenStable();
    click(f.nativeElement, 'Agregar');
    await f.whenStable();
    expect(TestBed.inject(CarritoService).cantidadTotal()).toBe(1);
    expect(f.nativeElement.textContent).toContain('Ver pedido (1)');
  });

  it('personaliza un helado con sabores, toppings y notas', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    click(el, 'Personalizar');
    await f.whenStable();
    click(el, 'Fresa');
    click(el, 'Vainilla');
    click(el, 'Maní');
    const notas = el.querySelector('textarea') as HTMLTextAreaElement;
    notas.value = 'Sin crema';
    notas.dispatchEvent(new Event('input'));
    click(el, 'Agregar al pedido');
    await f.whenStable();
    const linea = TestBed.inject(CarritoService).lineas()[0];
    expect(linea.sabores).toEqual(['Vainilla', 'Fresa']);
    expect(linea.toppings).toEqual(['Maní']);
    expect(linea.observaciones).toBe('Sin crema');
    // El primer tamaño queda elegido por defecto.
    expect(linea.tamano?.nombre).toBe('Pequeño');
  });

  it('muestra los sabores y toppings de la base de datos, en orden y sin los inactivos', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    click(el, 'Personalizar');
    await f.whenStable();
    const grupos = Array.from(el.querySelectorAll('.panel fieldset')).map((g) => ({
      titulo: g.querySelector('legend')!.textContent!.trim(),
      opciones: Array.from(g.querySelectorAll('button')).map((b) => b.textContent!.replace(/\s+/g, ' ').trim()),
    }));
    expect(grupos.slice(1)).toEqual([
      { titulo: 'Sabores', opciones: ['Vainilla', 'Fresa'] },
      { titulo: 'Toppings', opciones: ['Maní'] },
    ]);
  });

  it('un producto con tamaños muestra "Desde" y no se agrega sin abrir el panel', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.producto__precio')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('Desde $5.000');
    expect(textoBotones(el.querySelector('.producto__acciones') as HTMLElement)).toEqual(['Personalizar']);
  });

  it('elige un tamaño, muestra su precio y lo guarda en el carrito', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    click(el, 'Personalizar');
    await f.whenStable();
    const tamanosVisibles = Array.from(el.querySelectorAll('.panel fieldset')[0].querySelectorAll('button')).map((b) => b.textContent!.replace(/\s+/g, ' ').trim());
    expect(tamanosVisibles).toEqual(['Pequeño', 'Grande +$3.000']); // en orden y sin el inactivo
    click(el, 'Grande');
    await f.whenStable();
    expect(el.textContent).toContain('Agregar al pedido · $8.000');
    click(el, 'Agregar al pedido');
    await f.whenStable();
    const carrito = TestBed.inject(CarritoService);
    expect(carrito.lineas()[0].tamano).toEqual({ tamanoId: 2, nombre: 'Grande', precioAdicional: 3000 });
    expect(carrito.total()).toBe(8000);
    expect(carrito.aNuevoPedido(1).detalles[0].tamanoId).toBe(2);
  });

  it('permite reintentar si falla la carga', async () => {
    const f = TestBed.createComponent(Menu);
    http.expectOne('/api/Categorias').flush('x', { status: 500, statusText: 'Error' });
    http.match('/api/Productos'); // las peticiones paralelas quedan canceladas por forkJoin
    http.match('/api/Tamanos');
    http.match('/api/Opciones');
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    click(f.nativeElement, 'Reintentar');
    http.expectOne('/api/Categorias').flush(categorias);
    http.expectOne('/api/Productos').flush(productos);
    http.expectOne('/api/Tamanos').flush(tamanos);
    http.expectOne('/api/Opciones').flush(opciones);
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
  });
});
