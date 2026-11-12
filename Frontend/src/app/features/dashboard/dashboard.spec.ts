import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { errorInterceptor } from '../../core/interceptors/error';

registerLocaleData(localeEsCo);

const configurar = () => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'es-CO' }],
  });
  return TestBed.inject(HttpTestingController);
};

import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  it('calcula totales, ventas entregadas y pedidos por estado', async () => {
    const http = configurar();
    const f = TestBed.createComponent(Dashboard);
    http.expectOne('/api/Pedidos').flush([
      { pedidoId: 1, mesaId: 1, fecha: '', estado: 'Pendiente', total: 5000 },
      { pedidoId: 2, mesaId: 1, fecha: '', estado: 'Entregado', total: 9000 },
      { pedidoId: 3, mesaId: 2, fecha: '', estado: 'Entregado', total: 1000 },
    ]);
    http.expectOne('/api/Productos').flush([
      { productoId: 1, categoriaId: 1, nombre: 'a', precio: 1, activo: true },
      { productoId: 2, categoriaId: 1, nombre: 'b', precio: 1, activo: false },
    ]);
    http.expectOne('/api/Mesas').flush([{ mesaId: 1, numero: 1, estado: 'x' }]);
    await f.whenStable();
    const t = Array.from<HTMLElement>(f.nativeElement.querySelectorAll('.tarjeta')).map((c) => c.textContent!.replace(/\s+/g, ' ').trim());
    expect(t).toEqual([
      'Pedidos en total3', 'Ventas (pedidos entregados)$10.000', 'Productos disponibles1', 'Mesas1',
      'Pendiente1', 'En preparación0', 'Listo0', 'Entregado2', 'Cancelado0',
    ]);
  });

  it('muestra el error', async () => {
    const http = configurar();
    const f = TestBed.createComponent(Dashboard);
    http.expectOne('/api/Pedidos').flush('x', { status: 500, statusText: 'Error' });
    http.match('/api/Productos'); http.match('/api/Mesas');
    await f.whenStable();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
  });
});
