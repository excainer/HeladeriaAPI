import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';

import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error';
import { sesionInterceptor } from './core/interceptors/sesion';

// Formato colombiano para fechas y moneda (ej. $5.500).
registerLocaleData(localeEsCo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([sesionInterceptor, errorInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-CO' }
  ]
};
