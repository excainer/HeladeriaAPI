/**
 * Ítem que se envía al crear un pedido (POST /api/Pedidos).
 * No lleva precio: el backend lo toma de su catálogo para que no se pueda alterar desde el navegador.
 */
export interface NuevoDetalle {
  productoId: number;
  cantidad: number;
  sabores?: string;
  toppings?: string;
  observaciones?: string;
}

/** Cuerpo de POST /api/Pedidos. El total lo calcula el backend. */
export interface NuevoPedido {
  mesaId: number;
  detalles: NuevoDetalle[];
}
