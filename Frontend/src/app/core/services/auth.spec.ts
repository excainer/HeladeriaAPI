import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../interceptors/error';
import { AuthService } from './auth';
import { Usuario } from '../models/usuario.model';

const admin: Usuario = { usuarioId: 1, nombreUsuario: 'admin', nombre: 'Administrador', rol: 'Administrador', activo: true };

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('verifica la sesión con la API una sola vez', () => {
    let resultado: Usuario | null | undefined;
    service.verificar().subscribe((u) => (resultado = u));
    service.verificar().subscribe(); // petición en curso: se comparte
    http.expectOne('/api/Auth/yo').flush(admin);
    expect(resultado).toEqual(admin);
    expect(service.esAdministrador()).toBe(true);
    service.verificar().subscribe(); // ya verificada: no vuelve a preguntar
  });

  it('sin sesión (401) devuelve null en vez de fallar', () => {
    let resultado: Usuario | null | undefined;
    service.verificar().subscribe((u) => (resultado = u));
    http.expectOne('/api/Auth/yo').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(resultado).toBeNull();
  });

  it('inicia sesión enviando usuario y clave', () => {
    service.iniciarSesion('admin', 'secreta').subscribe();
    const req = http.expectOne('/api/Auth/login');
    expect(req.request.body).toEqual({ nombreUsuario: 'admin', clave: 'secreta' });
    req.flush(admin);
    expect(service.usuario()?.nombre).toBe('Administrador');
  });

  it('cierra sesión aunque la API falle', () => {
    service.iniciarSesion('admin', 'x').subscribe();
    http.expectOne('/api/Auth/login').flush(admin);
    let terminado = false;
    service.cerrarSesion().subscribe(() => (terminado = true));
    http.expectOne('/api/Auth/logout').flush('x', { status: 500, statusText: 'Error' });
    expect(terminado).toBe(true);
    expect(service.usuario()).toBeNull();
  });

  it('cambia la clave con PUT', () => {
    service.cambiarClave('vieja', 'nuevaClave').subscribe();
    const req = http.expectOne('/api/Auth/clave');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ claveActual: 'vieja', claveNueva: 'nuevaClave' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
