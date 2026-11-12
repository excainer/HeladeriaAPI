import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

/**
 * Si la sesión del personal vence (la API responde 401) mientras se usa la zona del personal,
 * se olvida la sesión y se vuelve al login, recordando la pantalla en la que estaba.
 * Las peticiones de /Auth se dejan pasar: sus 401 los maneja quien las hizo.
 */
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error: unknown) => {
      const status = (error as { status?: number }).status;
      const url = router.url;
      if (status === 401 && !req.url.includes('/Auth/') && url.startsWith('/personal') && !url.startsWith('/personal/login')) {
        auth.limpiar();
        router.navigate(['/personal/login'], { queryParams: { volver: url } });
      }
      return throwError(() => error);
    }),
  );
};
