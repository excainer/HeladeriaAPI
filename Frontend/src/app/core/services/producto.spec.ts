import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductoService } from './producto';

describe('ProductoService', () => {
  let service: ProductoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta todos los productos', () => {
    service.obtenerTodos().subscribe();
    http.expectOne('/api/Productos').flush([]);
  });

  it('consulta los productos de una categoría', () => {
    service.obtenerPorCategoria(1).subscribe();
    http.expectOne('/api/Productos?categoriaId=1').flush([]);
  });

  it('crea un producto con POST', () => {
    const datos = { categoriaId: 1, nombre: 'Capuchino', precio: 6500, activo: true };
    service.crear(datos).subscribe();
    const req = http.expectOne('/api/Productos');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(datos);
    req.flush({ productoId: 9, ...datos });
  });

  it('edita un producto con PUT', () => {
    const datos = { categoriaId: 1, nombre: 'Capuchino', precio: 7000, activo: false };
    service.actualizar(9, datos).subscribe();
    const req = http.expectOne('/api/Productos/9');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush({ productoId: 9, ...datos });
  });
});
