import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { errorInterceptor } from '../../core/interceptors/error';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MesaSesionService } from '../../core/services/mesa-sesion';
import { Carrito } from './carrito';
import { CarritoService } from '../../core/services/carrito';

registerLocaleData(localeEsCo);

describe('Carrito', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(withInterceptors([errorInterceptor])), provideHttpClientTesting(), { provide: LOCALE_ID, useValue: 'es-CO' }] });
  });

  it('muestra mensaje cuando está vacío', async () => {
    const f = TestBed.createComponent(Carrito);
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Todavía no has agregado nada.');
  });

  it('muestra opciones y total, y cambia cantidades', async () => {
    const c = TestBed.inject(CarritoService);
    c.agregar({ producto: { productoId: 1, nombre: 'Helado de Vainilla', precio: 5000 }, sabores: ['Fresa'], observaciones: 'Sin crema' });
    const f = TestBed.createComponent(Carrito);
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    expect(el.textContent).toContain('Sabores: Fresa');
    expect(el.textContent).toContain('Notas: Sin crema');
    (el.querySelector('[aria-label="Agregar una unidad"]') as HTMLButtonElement).click();
    await f.whenStable();
    expect(el.querySelector('.total')!.textContent).toContain('$10.000');
  });

  it('quita una línea', async () => {
    const c = TestBed.inject(CarritoService);
    c.agregar({ producto: { productoId: 1, nombre: 'Brownie', precio: 7000 } });
    const f = TestBed.createComponent(Carrito);
    await f.whenStable();
    (f.nativeElement.querySelector('.quitar') as HTMLButtonElement).click();
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Todavía no has agregado nada.');
  });

  describe('confirmar', () => {
    const preparar = async () => {
      TestBed.inject(MesaSesionService).establecer({ mesaId: 3, numero: 3, estado: 'Disponible' });
      TestBed.inject(CarritoService).agregar({ producto: { productoId: 1, nombre: 'Brownie', precio: 7000 } });
      const f = TestBed.createComponent(Carrito);
      await f.whenStable();
      return f;
    };
    const boton = (f: ReturnType<typeof TestBed.createComponent<Carrito>>) =>
      f.nativeElement.querySelector('.confirmar') as HTMLButtonElement;

    it('envía el pedido, vacía el carrito y va al seguimiento', async () => {
      const f = await preparar();
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      boton(f).click();
      const req = TestBed.inject(HttpTestingController).expectOne('/api/Pedidos');
      expect(req.request.body.mesaId).toBe(3);
      expect(req.request.body.paraLlevar).toBe(false); // por defecto, para comer aquí
      // El precio lo pone el backend: el navegador no lo envía.
      expect(req.request.body.detalles[0].precioUnitario).toBeUndefined();
      req.flush({ pedidoId: 12, mesaId: 3, fecha: '', estado: 'Pendiente', total: 7000 });
      await f.whenStable();
      expect(TestBed.inject(CarritoService).lineas()).toEqual([]);
      expect(navegar).toHaveBeenCalledWith(['/pedido', 12]);
    });

    it('el cliente puede pedirlo para llevar desde su mesa', async () => {
      const f = await preparar();
      const el: HTMLElement = f.nativeElement;
      (Array.from(el.querySelectorAll<HTMLButtonElement>('.modalidad button')).find((b) => b.textContent!.includes('Para llevar'))!).click();
      await f.whenStable();
      expect(el.querySelector('.modalidad [aria-pressed=true]')!.textContent).toContain('Para llevar');
      boton(f).click();
      const req = TestBed.inject(HttpTestingController).expectOne('/api/Pedidos');
      expect(req.request.body).toEqual(expect.objectContaining({ mesaId: 3, paraLlevar: true }));
    });

    it('si falla, muestra el error y conserva el carrito', async () => {
      const f = await preparar();
      boton(f).click();
      TestBed.inject(HttpTestingController).expectOne('/api/Pedidos').flush('No existe la mesa 3.', { status: 404, statusText: 'Not Found' });
      await f.whenStable();
      expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('mesa');
      expect(TestBed.inject(CarritoService).lineas().length).toBe(1);
      expect(boton(f).disabled).toBe(false);
    });

    it('no envía dos veces mientras espera respuesta', async () => {
      const f = await preparar();
      boton(f).click();
      boton(f).click();
      TestBed.inject(HttpTestingController).expectOne('/api/Pedidos');
    });
  });
});
