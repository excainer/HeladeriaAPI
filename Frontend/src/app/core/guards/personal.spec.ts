import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { administradorGuard, personalGuard } from './personal';

describe('Guards del personal', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  const ejecutar = (guard: typeof personalGuard, url = '/personal/pedidos') =>
    TestBed.runInInjectionContext(() =>
      firstValueFrom(guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as Observable<boolean | UrlTree>));
  const texto = (r: boolean | UrlTree) => (typeof r === 'boolean' ? r : TestBed.inject(Router).serializeUrl(r));

  it('sin sesión lleva al login recordando a dónde iba', async () => {
    const resultado = ejecutar(personalGuard);
    http.expectOne('/api/Auth/yo').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(texto(await resultado)).toBe('/personal/login?volver=%2Fpersonal%2Fpedidos');
  });

  it('con sesión deja pasar', async () => {
    const resultado = ejecutar(personalGuard);
    http.expectOne('/api/Auth/yo').flush({ usuarioId: 2, nombreUsuario: 'cocina', nombre: 'Cocina', rol: 'Empleado', activo: true });
    expect(await resultado).toBe(true);
  });

  it('un empleado no entra a la administración', async () => {
    const resultado = ejecutar(administradorGuard);
    http.expectOne('/api/Auth/yo').flush({ usuarioId: 2, nombreUsuario: 'cocina', nombre: 'Cocina', rol: 'Empleado', activo: true });
    expect(texto(await resultado)).toBe('/personal');
  });

  it('un administrador sí entra', async () => {
    const resultado = ejecutar(administradorGuard);
    http.expectOne('/api/Auth/yo').flush({ usuarioId: 1, nombreUsuario: 'admin', nombre: 'Admin', rol: 'Administrador', activo: true });
    expect(await resultado).toBe(true);
  });
});
