import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../../core/interceptors/error';
import { AuthService } from '../../core/services/auth';
import { Cuenta } from './cuenta';

describe('Cuenta', () => {
  let http: HttpTestingController;

  async function crear() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).iniciarSesion('laura', 'x').subscribe();
    http.expectOne('/api/Auth/login').flush({ usuarioId: 2, nombreUsuario: 'laura', nombre: 'Laura', rol: 'Empleado', activo: true });
    const f = TestBed.createComponent(Cuenta);
    await f.whenStable();
    return f;
  }

  const escribir = (el: HTMLElement, valores: [string, string, string]) =>
    el.querySelectorAll<HTMLInputElement>('form input').forEach((campo, i) => {
      campo.value = valores[i];
      campo.dispatchEvent(new Event('input'));
    });
  const enviar = (el: HTMLElement) => el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

  it('muestra los datos del usuario', async () => {
    const el: HTMLElement = (await crear()).nativeElement;
    expect(el.querySelector('.datos')!.textContent).toContain('laura');
    expect(el.querySelector('.datos')!.textContent).toContain('Empleado');
  });

  it('exige que la confirmación coincida', async () => {
    const f = await crear();
    escribir(f.nativeElement, ['vieja123', 'nuevaClave1', 'otraCosa1']);
    enviar(f.nativeElement);
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('no coincide');
    http.expectNone('/api/Auth/clave');
  });

  it('cambia la contraseña y limpia el formulario', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    escribir(el, ['vieja123', 'nuevaClave1', 'nuevaClave1']);
    await f.whenStable(); // en el navegador la pantalla se actualiza entre teclear y enviar
    enviar(el);
    http.expectOne('/api/Auth/clave').flush(null, { status: 204, statusText: 'No Content' });
    await f.whenStable();
    expect(el.querySelector('.mensaje-exito')!.textContent).toContain('Contraseña cambiada');
    expect((el.querySelector('form input') as HTMLInputElement).value).toBe('');
  });

  it('muestra el error si la contraseña actual es incorrecta', async () => {
    const f = await crear();
    escribir(f.nativeElement, ['mala1234', 'nuevaClave1', 'nuevaClave1']);
    enviar(f.nativeElement);
    http.expectOne('/api/Auth/clave').flush('La contraseña actual no es correcta.', { status: 400, statusText: 'Bad Request' });
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('actual no es correcta');
  });
});
