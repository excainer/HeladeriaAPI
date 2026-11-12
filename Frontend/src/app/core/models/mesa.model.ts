export interface Mesa {
  mesaId: number;
  numero: number;
  /** "Ocupada" si tiene pedidos sin entregar; si no, el estado guardado (normalmente "Disponible"). */
  estado: string;
  /** Pedidos de la mesa que todavía no se han entregado. */
  pedidosActivos?: number;
}
