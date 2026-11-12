import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { errorInterceptor } from '../../core/interceptors/error';
import { AuthService } from '../../core/services/auth';
import { Login } from './login';

describe('Login', () => {
  let http: HttpTestingController;

  const juan = { usuarioId: 1, nombreUsuario: 'excainer', nombre: 'Juan Gallo', rol: 'Administrador' as const, activo: true };

  /** sesion: usuario que ya tiene la sesión abierta en el navegador, o null si no hay. */
  async function crear(volver: string | null = null, sesion: typeof juan | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(volver ? { volver } : {}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(Login);
    const yo = http.expectOne('/api/Auth/yo');
    if (sesion) yo.flush(sesion);
    else yo.flush(null, { status: 401, statusText: 'Unauthorized' });
    await f.whenStable();
    return f;
  }

  const escribir = (el: HTMLElement, selector: string, valor: string) => {
    const campo = el.querySelector(selector) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };
  const enviar = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

  it('entra y vuelve a la pantalla que se pidió', async () => {
    const f = await crear('/personal/tamanos');
    const el: HTMLElement = f.nativeElement;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    escribir(el, 'input[autocomplete=username]', ' admin ');
    escribir(el, 'input[type=password]', 'HeladApp2026');
    enviar(el);
    const req = http.expectOne('/api/Auth/login');
    expect(req.request.body).toEqual({ nombreUsuario: 'admin', clave: 'HeladApp2026' });
    req.flush({ usuarioId: 1, nombreUsuario: 'admin', nombre: 'Administrador', rol: 'Administrador', activo: true });
    await f.whenStable();
    expect(TestBed.inject(AuthService).usuario()?.nombreUsuario).toBe('admin');
    expect(navegar).toHaveBeenCalledWith('/personal/tamanos');
  });

  it('no redirige fuera de la zona del personal', async () => {
    const f = await crear('https://otro-sitio.com');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    escribir(f.nativeElement, 'input[autocomplete=username]', 'admin');
    escribir(f.nativeElement, 'input[type=password]', 'x');
    enviar(f.nativeElement);
    http.expectOne('/api/Auth/login').flush({ usuarioId: 1, nombreUsuario: 'admin', nombre: 'A', rol: 'Administrador', activo: true });
    await f.whenStable();
    expect(navegar).toHaveBeenCalledWith('/personal');
  });

  it('muestra el error de credenciales y limpia la contraseña', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    escribir(el, 'input[autocomplete=username]', 'admin');
    escribir(el, 'input[type=password]', 'mala');
    await f.whenStable(); // en el navegador la pantalla se actualiza entre teclear y enviar
    enviar(el);
    http.expectOne('/api/Auth/login').flush('Usuario o contraseña incorrectos.', { status: 401, statusText: 'Unauthorized' });
    await f.whenStable();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Usuario o contraseña incorrectos.');
    expect((el.querySelector('input[type=password]') as HTMLInputElement).value).toBe('');
  });

  it('avisa si hay demasiados intentos', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    escribir(el, 'input[autocomplete=username]', 'admin');
    escribir(el, 'input[type=password]', 'x');
    enviar(el);
    http.expectOne('/api/Auth/login').flush(null, { status: 429, statusText: 'Too Many Requests' });
    await f.whenStable();
    expect(el.querySelector('[role=alert]')!.textContent).toContain('Demasiados intentos');
  });

  it('pide usuario y contraseña antes de enviar', async () => {
    const f = await crear();
    enviar(f.nativeElement);
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Escribe tu usuario');
    http.expectNone('/api/Auth/login');
  });

  it('ofrece al cliente volver al menú sin registrarse', async () => {
    const f = await crear();
    expect(f.nativeElement.querySelector('a.cliente').getAttribute('href')).toBe('/');
  });

  it('si ya hay una sesión abierta, pregunta en vez de entrar directo', async () => {
    const f = await crear('/personal/pedidos', juan);
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('Ya hay una sesión abierta');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const continuar = Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.includes('Continuar como Juan Gallo'))!;
    continuar.click();
    expect(navegar).toHaveBeenCalledWith('/personal/pedidos');
  });

  it('"Entrar con otra cuenta" cierra la sesión y muestra el formulario', async () => {
    const f = await crear(null, juan);
    const el: HTMLElement = f.nativeElement;
    Array.from(el.querySelectorAll('button')).find((b) => b.textContent!.includes('otra cuenta'))!.click();
    http.expectOne('/api/Auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await f.whenStable();
    expect(TestBed.inject(AuthService).usuario()).toBeNull();
    expect(el.querySelector('form input[autocomplete=username]')).toBeTruthy();
  });
});

