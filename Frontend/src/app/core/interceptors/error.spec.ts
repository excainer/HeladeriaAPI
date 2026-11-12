import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor, traducirError } from './error';
import { ApiError } from '../models/api-error.model';

describe('traducirError', () => {
  it('avisa cuando no hay conexión con el servidor', () => {
    const error = traducirError(new HttpErrorResponse({ status: 0 }));
    expect(error.message).toContain('No se pudo conectar');
  });

  it('usa el texto en español que envía el backend en un 400', () => {
    const error = traducirError(new HttpErrorResponse({ status: 400, error: 'Estado no válido.' }));
    expect(error.message).toBe('Estado no válido.');
    expect(error.status).toBe(400);
  });

  it('muestra un mensaje genérico si el 400 trae un objeto de validación en inglés', () => {
    const cuerpo = { errors: { Cantidad: ['The field Cantidad must be between 1 and 1000.'] } };
    const error = traducirError(new HttpErrorResponse({ status: 400, error: cuerpo }));
    expect(error.message).toContain('no son válidos');
  });

  it('usa el texto del backend en un 404 y un mensaje propio si viene vacío', () => {
    expect(traducirError(new HttpErrorResponse({ status: 404, error: 'No existe la mesa 9.' })).message)
      .toBe('No existe la mesa 9.');
    expect(traducirError(new HttpErrorResponse({ status: 404 })).message)
      .toBe('No se encontró lo que buscas.');
  });

  it('agrupa los errores del servidor en un solo mensaje', () => {
    expect(traducirError(new HttpErrorResponse({ status: 500 })).message).toContain('problema');
  });

  it('maneja errores que no son HTTP', () => {
    expect(traducirError(new Error('x')).status).toBe(0);
  });
});

describe('errorInterceptor', () => {
  it('entrega un ApiError a quien llama', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const cliente = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);

    let recibido: unknown;
    cliente.get('/api/Pedidos/99').subscribe({ error: (e: unknown) => (recibido = e) });
    http.expectOne('/api/Pedidos/99').flush(null, { status: 404, statusText: 'Not Found' });

    expect(recibido).toBeInstanceOf(ApiError);
    expect((recibido as ApiError).status).toBe(404);
    http.verify();
  });
  it('usa los mensajes de validación en español de la API', () => {
    const e = traducirError(new HttpErrorResponse({ status: 400, error: { errors: {
      Clave: ['La contraseña debe tener al menos 8 caracteres.'],
      Rol: ['The Rol field is required.'],
    } } }));
    expect(e.message).toBe('La contraseña debe tener al menos 8 caracteres.');
  });

  it('traduce 403 y 429', () => {
    expect(traducirError(new HttpErrorResponse({ status: 403 })).message).toContain('permiso');
    expect(traducirError(new HttpErrorResponse({ status: 429 })).message).toContain('Demasiados intentos');
  });
});
