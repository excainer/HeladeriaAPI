import { EstadoPedido } from './estado-pedido.model';

export interface Pedido {
  pedidoId: number;
  /** null = para llevar (registrado por el personal). */
  mesaId: number | null;
  fecha: string;
  estado: EstadoPedido;
  total: number;
  /** Se empaca para llevar (siempre true en pedidos de mostrador, sin mesa). */
  paraLlevar?: boolean;
  /** Usuario del personal que lo registró; null si lo hizo el cliente desde la mesa. */
  registradoPorId?: number | null;
  registradoPor?: string | null;
}
