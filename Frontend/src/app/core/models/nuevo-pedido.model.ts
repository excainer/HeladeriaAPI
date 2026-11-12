/**
 * Ítem que se envía al crear un pedido (POST /api/Pedidos).
 * No lleva precio: el backend lo toma de su catálogo para que no se pueda alterar desde el navegador.
 */
export interface NuevoDetalle {
  productoId: number;
  /** Obligatorio si la categoría del producto tiene tamaños activos. */
  tamanoId?: number;
  cantidad: number;
  sabores?: string;
  toppings?: string;
  observaciones?: string;
}

/** Cuerpo de POST /api/Pedidos. El total lo calcula el backend. */
export interface NuevoPedido {
  mesaId: number;
  detalles: NuevoDetalle[];
  /** Para llevar (se empaca). Por defecto, para comer en la mesa. */
  paraLlevar?: boolean;
}

/** Cuerpo de POST /api/Pedidos/personal: la mesa es opcional (null = para llevar). */
export interface PedidoDelPersonal {
  mesaId: number | null;
  detalles: NuevoDetalle[];
  /** Para llevar aunque tenga mesa (sin mesa siempre lo es). */
  paraLlevar: boolean;
}
