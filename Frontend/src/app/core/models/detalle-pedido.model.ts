export interface DetallePedido {
  detallePedidoId: number;
  pedidoId: number;
  productoId: number;
  /** null si el producto no maneja tamaños. */
  tamanoId?: number | null;
  cantidad: number;
  sabores?: string;
  toppings?: string;
  observaciones?: string;
  precioUnitario: number;
}
