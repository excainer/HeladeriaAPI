import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth';
import { errorInterceptor } from './error';
import { sesionInterceptor } from './sesion';

describe('sesionInterceptor', () => {
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([sesionInterceptor, errorInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  const pedir = (url: string) => TestBed.inject(HttpClient).get(url).subscribe({ error: () => undefined });

  it('si la sesión vence en la zona del personal, vuelve al login', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/personal/pedidos');
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const limpiar = vi.spyOn(TestBed.inject(AuthService), 'limpiar');
    pedir('/api/Pedidos');
    http.expectOne('/api/Pedidos').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(limpiar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/personal/login'], { queryParams: { volver: '/personal/pedidos' } });
  });

  it('no interfiere con el cliente ni con el propio login', () => {
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/menu');
    pedir('/api/Pedidos');
    http.expectOne('/api/Pedidos').flush(null, { status: 401, statusText: 'Unauthorized' });
    vi.spyOn(router, 'url', 'get').mockReturnValue('/personal/pedidos');
    pedir('/api/Auth/yo');
    http.expectOne('/api/Auth/yo').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).not.toHaveBeenCalled();
  });
});
