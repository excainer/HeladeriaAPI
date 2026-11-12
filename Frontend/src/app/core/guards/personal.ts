import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth';

/** La zona del personal exige sesión; si no hay, lleva al login y recuerda a dónde iba. */
export const personalGuard: CanActivateFn = (_ruta, estado) => {
  const router = inject(Router);
  const aLogin = () => router.createUrlTree(['/personal/login'], { queryParams: { volver: estado.url } });
  return inject(AuthService).verificar().pipe(
    map((usuario) => (usuario ? true : aLogin())),
    // Si la API no responde, se muestra el login (que informará el error al intentar entrar).
    catchError(() => of(aLogin())),
  );
};

/** Administración del catálogo y de usuarios: solo administradores. */
export const administradorGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthService).verificar().pipe(
    map((usuario) => (usuario?.rol === 'Administrador' ? true : router.createUrlTree(['/personal']))),
    catchError(() => of(router.createUrlTree(['/personal']))),
  );
};
