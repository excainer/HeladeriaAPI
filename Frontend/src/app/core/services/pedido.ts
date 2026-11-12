import { Injectable } from '@angular/core';
import { Api } from './api';
import { Pedido } from '../models/pedido.model';
import { DetallePedido } from '../models/detalle-pedido.model';
import { NuevoPedido, PedidoDelPersonal } from '../models/nuevo-pedido.model';
import { EstadoPedido } from '../models/estado-pedido.model';

@Injectable({
  providedIn: 'root',
})
export class PedidoService {

  private readonly endpoint = 'Pedidos';

  constructor(private api: Api) { }

  obtenerTodos() {
    return this.api.get<Pedido[]>(this.endpoint);
  }

  obtenerPorId(id: number) {
    return this.api.get<Pedido>(`${this.endpoint}/${id}`);
  }

  obtenerPorEstado(estado: EstadoPedido) {
    return this.api.get<Pedido[]>(`${this.endpoint}/estado/${encodeURIComponent(estado)}`);
  }

  obtenerPorMesa(mesaId: number) {
    return this.api.get<Pedido[]>(`${this.endpoint}/mesa/${mesaId}`);
  }

  obtenerDetalles(pedidoId: number) {
    return this.api.get<DetallePedido[]>(`${this.endpoint}/${pedidoId}/detalles`);
  }

  /** Crea el pedido con sus ítems. El backend calcula el total y lo devuelve en el Pedido. */
  crear(pedido: NuevoPedido) {
    return this.api.post<Pedido>(this.endpoint, pedido);
  }

  /** Registra un pedido desde el personal (con mesa o para llevar); queda constancia de quién fue. */
  registrar(pedido: PedidoDelPersonal) {
    return this.api.post<Pedido>(`${this.endpoint}/personal`, pedido);
  }

  /** Cancela un pedido pendiente (personal). Falla con 409 si la cocina ya empezó. */
  cancelar(pedidoId: number) {
    return this.api.post<void>(`${this.endpoint}/${pedidoId}/cancelar`, {});
  }

  /** Cambia el estado. El backend responde 204 sin contenido. */
  actualizarEstado(pedidoId: number, estado: EstadoPedido) {
    return this.api.put<void>(`${this.endpoint}/${pedidoId}/estado`, { estado });
  }

}
