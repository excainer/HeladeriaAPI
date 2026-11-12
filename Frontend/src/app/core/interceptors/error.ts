import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api-error.model';

/** Traduce cualquier fallo HTTP a un ApiError con un mensaje en español. */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => traducirError(error))));

export function traducirError(error: unknown): ApiError {
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('Ocurrió un error inesperado. Inténtalo de nuevo.', 0);
  }

  const { status } = error;

  if (status === 0) {
    return new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      status,
    );
  }

  if (status >= 500) {
    return new ApiError(
      'El servidor tuvo un problema. Inténtalo de nuevo en unos segundos.',
      status,
    );
  }

  // El backend responde con texto en español en sus errores explícitos, y con un objeto
  // { errors: { campo: [mensajes] } } cuando falla la validación automática de los datos.
  const detalle = typeof error.error === 'string' && error.error.trim()
    ? error.error
    : mensajesDeValidacion(error.error);

  if (status === 429) {
    return new ApiError('Demasiados intentos. Espera un minuto e inténtalo de nuevo.', status);
  }

  if (status === 403) {
    return new ApiError('Tu usuario no tiene permiso para hacer esto.', status);
  }

  if (status === 401) {
    return new ApiError(detalle ?? 'Tu sesión terminó. Inicia sesión de nuevo.', status);
  }

  if (status === 400) {
    return new ApiError(
      detalle ?? 'Los datos enviados no son válidos. Revísalos e inténtalo de nuevo.',
      status,
    );
  }

  if (status === 404) {
    return new ApiError(detalle ?? 'No se encontró lo que buscas.', status);
  }

  return new ApiError(detalle ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.', status);
}

/** Une los mensajes de validación en español de la API; ignora los genéricos en inglés. */
function mensajesDeValidacion(cuerpo: unknown): string | null {
  const errores = (cuerpo as { errors?: Record<string, string[]> } | null)?.errors;
  if (!errores || typeof errores !== 'object') return null;
  const mensajes = Object.values(errores)
    .flat()
    .filter((m) => typeof m === 'string' && !/^The |field|required/i.test(m));
  return mensajes.length ? [...new Set(mensajes)].join(' ') : null;
}
