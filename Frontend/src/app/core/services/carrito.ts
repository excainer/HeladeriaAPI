import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { Producto } from '../models/producto.model';
import { NuevoPedido } from '../models/nuevo-pedido.model';
import { Tamano } from '../models/tamano.model';

/** Copia del tamaño elegido: nombre y adicional quedan guardados aunque el catálogo cambie. */
export type TamanoElegido = Pick<Tamano, 'tamanoId' | 'nombre' | 'precioAdicional'>;

/**
 * Dónde se guarda el carrito en sessionStorage. El cliente usa el valor por defecto; la pantalla
 * del personal "Nuevo pedido" usa otra clave para que los dos carritos no se mezclen.
 */
export const CLAVE_CARRITO = new InjectionToken<string>('CLAVE_CARRITO', {
  providedIn: 'root',
  factory: () => 'heladapp.carrito',
});

/** Precio por unidad de una línea: producto + adicional del tamaño. */
export function precioUnitario(linea: Pick<LineaCarrito, 'producto' | 'tamano'>): number {
  return linea.producto.precio + (linea.tamano?.precioAdicional ?? 0);
}

/** Línea del carrito. Guarda una copia del producto para no depender del catálogo al recargar. */
export interface LineaCarrito {
  id: string;
  producto: Pick<Producto, 'productoId' | 'nombre' | 'precio'>;
  /** Tamaño elegido, o null si el producto no maneja tamaños. */
  tamano?: TamanoElegido | null;
  cantidad: number;
  sabores: string[];
  toppings: string[];
  observaciones: string;
}

export interface EntradaCarrito {
  producto: Pick<Producto, 'productoId' | 'nombre' | 'precio'>;
  tamano?: TamanoElegido | null;
  sabores?: string[];
  toppings?: string[];
  observaciones?: string;
}

/**
 * Carrito de compras del cliente. Vive solo en el navegador (sessionStorage):
 * el backend no lo conoce hasta que se confirma el pedido.
 * Los sabores y toppings no cambian el precio; el tamaño sí: precio del producto + adicional del tamaño.
 * El precio aquí es solo informativo: el backend lo vuelve a calcular con su catálogo.
 */
@Injectable({
  providedIn: 'root',
})
export class CarritoService {
  private readonly clave = inject(CLAVE_CARRITO);

  private readonly _lineas = signal<LineaCarrito[]>(this.leer());

  readonly lineas = this._lineas.asReadonly();

  readonly cantidadTotal = computed(() =>
    this._lineas().reduce((suma, linea) => suma + linea.cantidad, 0));

  readonly total = computed(() =>
    this._lineas().reduce((suma, linea) => suma + linea.cantidad * precioUnitario(linea), 0));

  /** Agrega un ítem. Si ya existe uno idéntico (mismas opciones), suma una unidad. */
  agregar(entrada: EntradaCarrito) {
    const sabores = entrada.sabores ?? [];
    const toppings = entrada.toppings ?? [];
    const observaciones = (entrada.observaciones ?? '').trim();
    const tamano = entrada.tamano
      ? { tamanoId: entrada.tamano.tamanoId, nombre: entrada.tamano.nombre, precioAdicional: entrada.tamano.precioAdicional }
      : null;
    const id = [entrada.producto.productoId, tamano?.tamanoId ?? '', sabores.join(','), toppings.join(','), observaciones].join('|');

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
        tamano,
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
        tamanoId: linea.tamano?.tamanoId,
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
      sessionStorage.setItem(this.clave, JSON.stringify(lineas));
    } catch {
      // Sin almacenamiento disponible: el carrito se mantiene solo en memoria.
    }
  }

  private leer(): LineaCarrito[] {
    try {
      const guardado = sessionStorage.getItem(this.clave);
      return guardado ? (JSON.parse(guardado) as LineaCarrito[]) : [];
    } catch {
      return [];
    }
  }
}
