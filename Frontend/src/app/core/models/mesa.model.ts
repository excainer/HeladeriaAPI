export interface Mesa {
  mesaId: number;
  numero: number;
  /** "Ocupada" desde su primer pedido hasta que el personal la libera; si no, normalmente "Disponible". */
  estado: string;
  /** Pedidos de la mesa que todavía no se han entregado. */
  pedidosActivos?: number;
  /** Pedidos hechos desde la última liberación (entregados o no). */
  pedidosDesdeLiberacion?: number;
  /** Ocupada con todo entregado: el personal ya puede liberarla. */
  puedeLiberarse?: boolean;
  /** Última vez que se liberó (fecha ISO), o null. */
  liberadaEn?: string | null;
}
