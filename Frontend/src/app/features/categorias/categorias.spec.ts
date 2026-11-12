import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../../core/interceptors/error';
import { Categorias } from './categorias';

describe('Categorias', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function crear() {
    const f = TestBed.createComponent(Categorias);
    http.expectOne('/api/Categorias').flush([{ categoriaId: 1, nombre: 'Helados' }, { categoriaId: 2, nombre: 'Postres' }]);
    http.expectOne('/api/Productos').flush([
      { productoId: 1, categoriaId: 1, nombre: 'a', precio: 1, activo: true },
      { productoId: 2, categoriaId: 1, nombre: 'b', precio: 1, activo: true },
    ]);
    http.expectOne('/api/Tamanos').flush([
      { tamanoId: 1, categoriaId: 1, nombre: 'Pequeño', precioAdicional: 0, orden: 1, activo: true },
      { tamanoId: 2, categoriaId: 1, nombre: 'Grande', precioAdicional: 2000, orden: 2, activo: true },
      { tamanoId: 3, categoriaId: 1, nombre: 'Viejo', precioAdicional: 0, orden: 3, activo: false },
    ]);
    await f.whenStable();
    return f;
  }

  const filas = (el: HTMLElement) =>
    Array.from<HTMLElement>(el.querySelectorAll('tbody tr')).map((r) =>
      Array.from(r.children).slice(0, 3).map((c) => c.textContent!.trim()));
  // En jsdom un clic en el botón de envío no envía un formulario desconectado del documento.
  const enviarFormulario = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const boton = (el: HTMLElement, texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.trim() === texto)!;
  const escribir = (el: HTMLElement, valor: string) => {
    const campo = el.querySelector('form input') as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  it('cuenta los productos y los tamaños activos de cada categoría', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    expect(filas(el)).toEqual([['Helados', '2', '2'], ['Postres', '0', '—']]);
  });

  it('crea una categoría', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nueva categoría').click();
    await f.whenStable();
    escribir(el, ' Café ');
    enviarFormulario(el);
    const req = http.expectOne('/api/Categorias');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Café' });
    req.flush({ categoriaId: 3, nombre: 'Café' });
    await f.whenStable();
    expect(filas(el)[2]).toEqual(['Café', '0', '—']);
  });

  it('renombra una categoría y muestra el error si el nombre ya existe', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    (el.querySelector('[aria-label="Renombrar Postres"]') as HTMLButtonElement).click();
    await f.whenStable();
    escribir(el, 'Helados');
    enviarFormulario(el);
    http.expectOne('/api/Categorias/2').flush('Ya existe una categoría llamada "Helados".', { status: 409, statusText: 'Conflict' });
    await f.whenStable();
    expect(el.querySelector('form [role=alert]')!.textContent).toContain('Ya existe');
  });

  it('muestra el error', async () => {
    const f = TestBed.createComponent(Categorias);
    http.expectOne('/api/Categorias').flush('x', { status: 500, statusText: 'Error' });
    http.match('/api/Productos');
    http.match('/api/Tamanos');
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
  });
});
