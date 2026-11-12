import { TestBed } from '@angular/core/testing';
import { CarritoService } from './carrito';

const helado = { productoId: 1, nombre: 'Helado de Vainilla', precio: 5000 };
const brownie = { productoId: 6, nombre: 'Brownie', precio: 7000 };

describe('CarritoService', () => {
  let service: CarritoService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CarritoService);
  });

  it('suma una unidad si el ítem es idéntico', () => {
    service.agregar({ producto: helado });
    service.agregar({ producto: helado });
    expect(service.lineas().length).toBe(1);
    expect(service.cantidadTotal()).toBe(2);
    expect(service.total()).toBe(10000);
  });

  it('separa ítems con distintas opciones y no cobra extras', () => {
    service.agregar({ producto: helado });
    service.agregar({ producto: helado, sabores: ['Fresa'], toppings: ['Maní'] });
    expect(service.lineas().length).toBe(2);
    expect(service.total()).toBe(10000);
  });

  it('quita la línea cuando la cantidad llega a 0', () => {
    service.agregar({ producto: brownie });
    service.cambiarCantidad(service.lineas()[0].id, -1);
    expect(service.lineas()).toEqual([]);
  });

  it('quita y vacía', () => {
    service.agregar({ producto: helado });
    service.agregar({ producto: brownie });
    service.quitar(service.lineas()[0].id);
    expect(service.lineas().length).toBe(1);
    service.vaciar();
    expect(service.cantidadTotal()).toBe(0);
  });

  it('arma el cuerpo del pedido omitiendo textos vacíos', () => {
    service.agregar({ producto: helado, sabores: ['Chocolate', 'Fresa'], observaciones: '  Sin crema ' });
    service.agregar({ producto: brownie });
    expect(service.aNuevoPedido(3)).toEqual({
      mesaId: 3,
      detalles: [
        { productoId: 1, cantidad: 1, sabores: 'Chocolate, Fresa', toppings: undefined, observaciones: 'Sin crema' },
        { productoId: 6, cantidad: 1, sabores: undefined, toppings: undefined, observaciones: undefined },
      ],
    });
  });

  it('guarda en sessionStorage y se recupera', () => {
    service.agregar({ producto: helado });
    expect(JSON.parse(sessionStorage.getItem('heladapp.carrito')!).length).toBe(1);
  });
});
