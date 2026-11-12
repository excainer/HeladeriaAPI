import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { errorInterceptor } from '../../core/interceptors/error';
import { Productos } from './productos';

registerLocaleData(localeEsCo);

const productos = [
  { productoId: 1, categoriaId: 1, nombre: 'Helado de Fresa', precio: 5000, activo: true },
  { productoId: 2, categoriaId: 9, nombre: 'Agotado', precio: 1000, activo: false },
];
const categorias = [{ categoriaId: 1, nombre: 'Helados' }, { categoriaId: 2, nombre: 'Bebidas' }];

describe('Productos', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'es-CO' }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function crear() {
    const f = TestBed.createComponent(Productos);
    http.expectOne('/api/Productos').flush(productos);
    http.expectOne('/api/Categorias').flush(categorias);
    await f.whenStable();
    return f;
  }

  const celdas = (el: HTMLElement, fila: number) =>
    Array.from(el.querySelectorAll('tbody tr')[fila].children).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
  // En jsdom un clic en el botón de envío no envía un formulario desconectado del documento.
  const enviarFormulario = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const boton = (el: HTMLElement, texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.trim() === texto)!;
  const escribir = (el: HTMLElement, selector: string, valor: string) => {
    const campo = el.querySelector(selector) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  it('lista productos con categoría, precio y disponibilidad', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    expect(celdas(el, 0).slice(0, 4)).toEqual(['Helado de Fresa', 'Helados', '$5.000', 'Disponible']);
    expect(celdas(el, 1)).toContain('Categoría 9');
    expect(celdas(el, 1)).toContain('No disponible');
  });

  it('crea un producto nuevo', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo producto').click();
    await f.whenStable();
    escribir(el, 'form input[type=text]', '  Capuchino ');
    escribir(el, 'form input[type=number]', '6500');
    const select = el.querySelector('form select') as HTMLSelectElement;
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    enviarFormulario(el);

    const req = http.expectOne('/api/Productos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Capuchino', categoriaId: 2, precio: 6500, activo: true });
    req.flush({ productoId: 3, nombre: 'Capuchino', categoriaId: 2, precio: 6500, activo: true });
    await f.whenStable();

    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('Capuchino');
    expect(celdas(el, 2).slice(0, 3)).toEqual(['Capuchino', 'Bebidas', '$6.500']);
  });

  it('valida el formulario antes de enviar', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo producto').click();
    await f.whenStable();
    escribir(el, 'form input[type=text]', 'Capuchino');
    escribir(el, 'form input[type=number]', '0');
    enviarFormulario(el);
    await f.whenStable();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('mayor que cero');
    http.expectNone('/api/Productos');
  });

  it('edita un producto y muestra el error de la API si el nombre se repite', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    (el.querySelector('[aria-label="Editar Helado de Fresa"]') as HTMLButtonElement).click();
    await f.whenStable();
    expect((el.querySelector('form input[type=text]') as HTMLInputElement).value).toBe('Helado de Fresa');
    escribir(el, 'form input[type=text]', 'Agotado');
    enviarFormulario(el);
    http.expectOne('/api/Productos/1').flush('Ya existe un producto llamado "Agotado" en esa categoría.', { status: 409, statusText: 'Conflict' });
    await f.whenStable();
    expect(el.querySelector('form [role=alert]')!.textContent).toContain('Ya existe un producto');
    expect(el.querySelector('form')).toBeTruthy();
  });

  it('activa y desactiva sin abrir el formulario', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Desactivar').click();
    const req = http.expectOne('/api/Productos/1');
    expect(req.request.body.activo).toBe(false);
    req.flush({ ...productos[0], activo: false });
    await f.whenStable();
    expect(celdas(el, 0)[3]).toBe('No disponible');
  });

  it('muestra el error y permite reintentar', async () => {
    const f = TestBed.createComponent(Productos);
    http.expectOne('/api/Productos').flush('x', { status: 500, statusText: 'Error' });
    http.match('/api/Categorias');
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    (f.nativeElement.querySelector('[role=alert] button') as HTMLButtonElement).click();
    http.expectOne('/api/Productos').flush([]);
    http.expectOne('/api/Categorias').flush([]);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No hay productos registrados.');
  });
});
