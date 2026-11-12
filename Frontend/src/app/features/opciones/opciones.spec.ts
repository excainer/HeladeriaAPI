import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../../core/interceptors/error';
import { Opciones } from './opciones';

const categorias = [{ categoriaId: 1, nombre: 'Helados' }, { categoriaId: 2, nombre: 'Bebidas' }];
const opciones = [
  { opcionId: 6, categoriaId: 2, tipo: 'Sabor', nombre: 'Fresa', orden: 1, activo: true },
  { opcionId: 4, categoriaId: 1, tipo: 'Topping', nombre: 'Maní', orden: 1, activo: true },
  { opcionId: 2, categoriaId: 1, tipo: 'Sabor', nombre: 'Chocolate', orden: 2, activo: true },
  { opcionId: 1, categoriaId: 1, tipo: 'Sabor', nombre: 'Vainilla', orden: 1, activo: true },
];

describe('Opciones', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  async function crear() {
    const f = TestBed.createComponent(Opciones);
    http.expectOne('/api/Opciones').flush(opciones);
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

  it('lista las opciones por categoría, luego sabores antes que toppings y en su orden', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    expect(filas(el)).toEqual([
      ['Helados', 'Sabor', 'Vainilla', '1', 'Disponible'],
      ['Helados', 'Sabor', 'Chocolate', '2', 'Disponible'],
      ['Helados', 'Topping', 'Maní', '1', 'Disponible'],
      ['Bebidas', 'Sabor', 'Fresa', '1', 'Disponible'],
    ]);
  });

  it('crea un topping y sugiere ponerlo al final de su tipo', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo topping').click();
    await f.whenStable();
    expect(el.querySelector('form h2')!.textContent).toBe('Nuevo topping');
    // Helados ya tiene un topping con orden 1: se sugiere 2.
    expect(el.querySelectorAll<HTMLInputElement>('form input')[1].value).toBe('2');
    escribir(el, 0, 'Gomitas');
    enviarFormulario(el);
    const req = http.expectOne('/api/Opciones');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ categoriaId: 1, tipo: 'Topping', nombre: 'Gomitas', orden: 2, activo: true });
    req.flush({ opcionId: 9, categoriaId: 1, tipo: 'Topping', nombre: 'Gomitas', orden: 2, activo: true });
    await f.whenStable();
    expect(filas(el)[3]).toEqual(['Helados', 'Topping', 'Gomitas', '2', 'Disponible']);
    expect(el.querySelector('[role=status]')!.textContent).toContain('Topping "Gomitas" creado.');
  });

  it('no permite nombres con comas', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo sabor').click();
    await f.whenStable();
    escribir(el, 0, 'Mango, Kiwi');
    enviarFormulario(el);
    await f.whenStable();
    expect(el.querySelector('form [role=alert]')!.textContent).toContain('comas');
    http.expectNone('/api/Opciones');
  });

  it('muestra el error de la API si el nombre ya existe', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo sabor').click();
    await f.whenStable();
    escribir(el, 0, 'vainilla');
    enviarFormulario(el);
    http.expectOne('/api/Opciones').flush('Ya existe un sabor llamado "vainilla" en esa categoría.', { status: 409, statusText: 'Conflict' });
    await f.whenStable();
    expect(el.querySelector('form [role=alert]')!.textContent).toContain('Ya existe un sabor');
  });

  it('desactiva un sabor', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Desactivar').click();
    const req = http.expectOne('/api/Opciones/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ categoriaId: 1, tipo: 'Sabor', nombre: 'Vainilla', orden: 1, activo: false });
    req.flush({ ...opciones[3], activo: false });
    await f.whenStable();
    expect(filas(el)[0][4]).toBe('No disponible');
  });
});
