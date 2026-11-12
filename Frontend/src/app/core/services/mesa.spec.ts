import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from '../interceptors/error';
import { MesaService } from './mesa';
import { Mesa } from '../models/mesa.model';

describe('MesaService', () => {
  let service: MesaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting()],
    });
    service = TestBed.inject(MesaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca la mesa por su número (no por su id) en la API', () => {
    let resultado: Mesa | undefined;
    service.obtenerPorNumero(2).subscribe((mesa) => (resultado = mesa));
    http.expectOne('/api/Mesas/numero/2').flush({ mesaId: 11, numero: 2, estado: 'Disponible' });
    expect(resultado?.mesaId).toBe(11);
  });

  it('devuelve undefined si el número de mesa no existe', () => {
    let resultado: Mesa | undefined = { mesaId: 1, numero: 1, estado: 'x' };
    service.obtenerPorNumero(99).subscribe((mesa) => (resultado = mesa));
    http.expectOne('/api/Mesas/numero/99').flush('No existe la mesa número 99.', { status: 404, statusText: 'Not Found' });
    expect(resultado).toBeUndefined();
  });

  it('propaga otros errores', () => {
    let error: unknown;
    service.obtenerPorNumero(2).subscribe({ error: (e) => (error = e) });
    http.expectOne('/api/Mesas/numero/2').flush('x', { status: 500, statusText: 'Error' });
    expect((error as { status: number }).status).toBe(500);
  });

  it('libera una mesa con POST', () => {
    service.liberar(4).subscribe();
    const req = http.expectOne('/api/Mesas/4/liberar');
    expect(req.request.method).toBe('POST');
    req.flush({ mesaId: 4, numero: 4, estado: 'Disponible' });
  });
});

