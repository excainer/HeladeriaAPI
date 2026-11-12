import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { errorInterceptor } from '../../core/interceptors/error';
import { Tamanos } from './tamanos';

registerLocaleData(localeEsCo);

const categorias = [{ categoriaId: 1, nombre: 'Helados' }, { categoriaId: 2, nombre: 'Bebidas' }];
const tamanos = [
  { tamanoId: 4, categoriaId: 2, nombre: 'Mediano', precioAdicional: 0, orden: 1, activo: true },
  { tamanoId: 2, categoriaId: 1, nombre: 'Grande', precioAdicional: 4000, orden: 2, activo: true },
  { tamanoId: 1, categoriaId: 1, nombre: 'Pequeño', precioAdicional: 0, orden: 1, activo: true },
];

describe('Tamanos', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'es-CO' }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function crear() {
    const f = TestBed.createComponent(Tamanos);
    http.expectOne('/api/Tamanos').flush(tamanos);
    http.expectOne('/api/Categorias').flush(categorias);
    await f.whenStable();
    return f;
  }

  const filas = (el: HTMLElement) =>
    Array.from<HTMLElement>(el.querySelectorAll('tbody tr')).map((r) =>
      Array.from(r.children).slice(0, 5).map((c) => c.textContent!.trim()));
  // En jsdom un clic en el botón de envío no envía un formulario desconectado del documento.
  const enviarFormulario = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const boton = (el: HTMLElement, texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.trim() === texto)!;
  const escribir = (el: HTMLElement, indice: number, valor: string) => {
    const campo = el.querySelectorAll<HTMLInputElement>('form input')[indice];
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  it('lista los tamaños agrupados por categoría y en su orden', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    expect(filas(el)).toEqual([
      ['Helados', 'Pequeño', '+$0', '1', 'Disponible'],
      ['Helados', 'Grande', '+$4.000', '2', 'Disponible'],
      ['Bebidas', 'Mediano', '+$0', '1', 'Disponible'],
    ]);
  });

  it('crea un tamaño y sugiere ponerlo al final de su categoría', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo tamaño').click();
    await f.whenStable();
    // Helados ya tiene orden 1 y 2: se sugiere 3.
    expect(el.querySelectorAll<HTMLInputElement>('form input')[2].value).toBe('3');
    escribir(el, 0, 'Gigante');
    escribir(el, 1, '6000');
    enviarFormulario(el);
    const req = http.expectOne('/api/Tamanos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ categoriaId: 1, nombre: 'Gigante', precioAdicional: 6000, orden: 3, activo: true });
    req.flush({ tamanoId: 9, categoriaId: 1, nombre: 'Gigante', precioAdicional: 6000, orden: 3, activo: true });
    await f.whenStable();
    expect(filas(el)[2]).toEqual(['Helados', 'Gigante', '+$6.000', '3', 'Disponible']);
  });

  it('no permite un precio adicional negativo', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo tamaño').click();
    await f.whenStable();
    escribir(el, 0, 'Raro');
    escribir(el, 1, '-500');
    enviarFormulario(el);
    await f.whenStable();
    expect(el.querySelector('form [role=alert]')!.textContent).toContain('negativo');
    http.expectNone('/api/Tamanos');
  });

  it('desactiva un tamaño', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Desactivar').click();
    const req = http.expectOne('/api/Tamanos/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ categoriaId: 1, nombre: 'Pequeño', precioAdicional: 0, orden: 1, activo: false });
    req.flush({ ...tamanos[2], activo: false });
    await f.whenStable();
    expect(filas(el)[0][4]).toBe('No disponible');
  });
});
