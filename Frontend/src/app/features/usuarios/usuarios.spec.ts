import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from '../../core/interceptors/error';
import { AuthService } from '../../core/services/auth';
import { Usuarios } from './usuarios';

const admin = { usuarioId: 1, nombreUsuario: 'admin', nombre: 'Administrador', rol: 'Administrador', activo: true };
const laura = { usuarioId: 2, nombreUsuario: 'laura', nombre: 'Laura', rol: 'Empleado', activo: true };

describe('Usuarios', () => {
  let http: HttpTestingController;

  async function crear() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).iniciarSesion('admin', 'x').subscribe();
    http.expectOne('/api/Auth/login').flush(admin);
    const f = TestBed.createComponent(Usuarios);
    http.expectOne('/api/Usuarios').flush([admin, laura]);
    await f.whenStable();
    return f;
  }

  const enviarFormulario = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  const boton = (el: HTMLElement, texto: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.trim() === texto)!;
  const escribir = (el: HTMLElement, indice: number, valor: string) => {
    const campo = el.querySelectorAll<HTMLInputElement>('form input')[indice];
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };

  it('lista los usuarios y marca la cuenta propia', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    const filas = Array.from(el.querySelectorAll('tbody tr')).map((r) => r.textContent!.replace(/\s+/g, ' ').trim());
    expect(filas[0]).toContain('Administrador (tú)');
    expect(filas[1]).toContain('laura');
    expect(filas[1]).toContain('Empleado');
  });

  it('crea un empleado con contraseña inicial', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo usuario').click();
    await f.whenStable();
    escribir(el, 0, 'pedro');
    escribir(el, 1, 'Pedro');
    escribir(el, 2, 'inicial123');
    enviarFormulario(el);
    const req = http.expectOne('/api/Usuarios');
    expect(req.request.body).toEqual({ nombreUsuario: 'pedro', nombre: 'Pedro', clave: 'inicial123', rol: 'Empleado' });
    req.flush({ usuarioId: 3, nombreUsuario: 'pedro', nombre: 'Pedro', rol: 'Empleado', activo: true });
    await f.whenStable();
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('pedro');
  });

  it('valida usuario y contraseña antes de enviar', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    boton(el, 'Nuevo usuario').click();
    await f.whenStable();
    escribir(el, 0, 'con espacio');
    escribir(el, 1, 'X');
    escribir(el, 2, 'corta');
    enviarFormulario(el);
    await f.whenStable();
    expect(el.querySelector('form [role=alert]')!.textContent).toContain('sin espacios');
    http.expectNone('/api/Usuarios');
  });

  it('desactiva a un usuario sin cambiar su contraseña', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    (el.querySelector('[aria-label="Editar laura"]') as HTMLButtonElement).click();
    await f.whenStable();
    const activo = el.querySelector('form input[type=checkbox]') as HTMLInputElement;
    activo.checked = false;
    activo.dispatchEvent(new Event('change'));
    enviarFormulario(el);
    const req = http.expectOne('/api/Usuarios/2');
    expect(req.request.body).toEqual({ nombre: 'Laura', rol: 'Empleado', activo: false, claveNueva: null });
    req.flush({ ...laura, activo: false });
    await f.whenStable();
    expect(el.querySelectorAll('tbody tr')[1].textContent).toContain('Inactivo');
  });
});
