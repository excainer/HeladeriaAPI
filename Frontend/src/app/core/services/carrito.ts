import { Injectable, computed, signal } from '@angular/core';
import { Producto } from '../models/producto.model';
import { NuevoPedido } from '../models/nuevo-pedido.model';

const CLAVE = 'heladapp.carrito';

/** Línea del carrito. Guarda una copia del producto para no depender del catálogo al recargar. */
export interface LineaCarrito {
  id: string;
  producto: Pick<Producto, 'productoId' | 'nombre' | 'precio'>;
  cantidad: number;
  sabores: string[];
  toppings: string[];
  observaciones: string;
}

export interface EntradaCarrito {
  producto: Pick<Producto, 'productoId' | 'nombre' | 'precio'>;
  sabores?: string[];
  toppings?: string[];
  observaciones?: string;
}

/**
 * Carrito de compras del cliente. Vive solo en el navegador (sessionStorage):
 * el backend no lo conoce hasta que se confirma el pedido.
 * Los extras (sabores, toppings) no cambian el precio: el precio unitario es el del producto.
 */
@Injectable({
  providedIn: 'root',
})
export class CarritoService {

  private readonly _lineas = signal<LineaCarrito[]>(this.leer());

  readonly lineas = this._lineas.asReadonly();

  readonly cantidadTotal = computed(() =>
    this._lineas().reduce((suma, linea) => suma + linea.cantidad, 0));

  readonly total = computed(() =>
    this._lineas().reduce((suma, linea) => suma + linea.cantidad * linea.producto.precio, 0));

  /** Agrega un ítem. Si ya existe uno idéntico (mismas opciones), suma una unidad. */
  agregar(entrada: EntradaCarrito) {
    const sabores = entrada.sabores ?? [];
    const toppings = entrada.toppings ?? [];
    const observaciones = (entrada.observaciones ?? '').trim();
    const id = [entrada.producto.productoId, sabores.join(','), toppings.join(','), observaciones].join('|');

    const existente = this._lineas().find((linea) => linea.id === id);
    if (existente) {
      this.guardar(this._lineas().map((linea) =>
        linea.id === id ? { ...linea, cantidad: linea.cantidad + 1 } : linea));
      return;
    }

    this.guardar([
      ...this._lineas(),
      {
        id,
        producto: {
          productoId: entrada.producto.productoId,
          nombre: entrada.producto.nombre,
          precio: entrada.producto.precio,
        },
        cantidad: 1,
        sabores,
        toppings,
        observaciones,
      },
    ]);
  }

  /** Suma o resta unidades. Si la cantidad llega a 0 la línea se quita. */
  cambiarCantidad(id: string, diferencia: number) {
    this.guardar(
      this._lineas()
        .map((linea) => (linea.id === id ? { ...linea, cantidad: linea.cantidad + diferencia } : linea))
        .filter((linea) => linea.cantidad > 0),
    );
  }

  quitar(id: string) {
    this.guardar(this._lineas().filter((linea) => linea.id !== id));
  }

  vaciar() {
    this.guardar([]);
  }

  /** Cuerpo para POST /api/Pedidos. Los campos de texto vacíos se omiten. */
  aNuevoPedido(mesaId: number): NuevoPedido {
    return {
      mesaId,
      detalles: this._lineas().map((linea) => ({
        productoId: linea.producto.productoId,
        cantidad: linea.cantidad,
        sabores: linea.sabores.length ? linea.sabores.join(', ') : undefined,
        toppings: linea.toppings.length ? linea.toppings.join(', ') : undefined,
        observaciones: linea.observaciones || undefined,
      })),
    };
  }

  private guardar(lineas: LineaCarrito[]) {
    this._lineas.set(lineas);
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(lineas));
    } catch {
      // Sin almacenamiento disponible: el carrito se mantiene solo en memoria.
    }
  }

  private leer(): LineaCarrito[] {
    try {
      const guardado = sessionStorage.getItem(CLAVE);
      return guardado ? (JSON.parse(guardado) as LineaCarrito[]) : [];
    } catch {
      return [];
    }
  }
}
