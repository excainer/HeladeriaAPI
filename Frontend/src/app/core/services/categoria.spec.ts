import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoriaService } from './categoria';

describe('CategoriaService', () => {
  let service: CategoriaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoriaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta todas las categorías', () => {
    service.obtenerTodos().subscribe();
    http.expectOne('/api/Categorias').flush([]);
  });

  it('consulta una categoría por id', () => {
    service.obtenerPorId(2).subscribe();
    http.expectOne('/api/Categorias/2').flush({});
  });

  it('crea y renombra categorías', () => {
    service.crear({ nombre: 'Café' }).subscribe();
    const crear = http.expectOne('/api/Categorias');
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual({ nombre: 'Café' });
    crear.flush({ categoriaId: 5, nombre: 'Café' });

    service.actualizar(5, { nombre: 'Cafetería' }).subscribe();
    const editar = http.expectOne('/api/Categorias/5');
    expect(editar.request.method).toBe('PUT');
    editar.flush({ categoriaId: 5, nombre: 'Cafetería' });
  });
});
