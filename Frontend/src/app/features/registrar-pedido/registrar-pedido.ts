import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Mesa } from '../../core/models/mesa.model';
import { CLAVE_CARRITO, CarritoService, LineaCarrito, precioUnitario } from '../../core/services/carrito';
import { MesaService } from '../../core/services/mesa';
import { PedidoService } from '../../core/services/pedido';
import { mensajeError } from '../../core/utils/errores';
import { Pesos } from '../../shared/pipes/pesos';
import { Menu } from '../menu/menu';

/**
 * El personal registra un pedido que el cliente no hizo desde la mesa (en el mostrador o con el mesero).
 * Reutiliza el menú del cliente con un carrito propio, y queda guardado quién lo registró.
 */
@Component({
  selector: 'app-registrar-pedido',
  imports: [Menu, Pesos, RouterLink],
  templateUrl: './registrar-pedido.html',
  styleUrl: './registrar-pedido.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Carrito separado del de los clientes (por si el mismo dispositivo se usa para ambos).
  providers: [{ provide: CLAVE_CARRITO, useValue: 'heladapp.carrito.personal' }, CarritoService],
})
export class RegistrarPedido {
  protected readonly carrito = inject(CarritoService);
  private readonly mesaService = inject(MesaService);
  private readonly pedidoService = inject(PedidoService);

  protected readonly precioUnitario = precioUnitario;
  protected readonly mesas = signal<Mesa[]>([]);
  /** '' = mostrador (sin mesa); si no, el id de la mesa. */
  protected readonly mesaElegida = signal('');
  /** Para llevar con mesa; sin mesa (mostrador) siempre es para llevar. */
  protected readonly paraLlevar = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly registrado = signal<{ pedidoId: number; destino: string } | null>(null);

  constructor() {
    this.mesaService.obtenerTodos().subscribe({
      next: (m) => this.mesas.set([...m].sort((a, b) => a.numero - b.numero)),
      error: () => this.error.set('No se pudieron cargar las mesas. Puedes registrar el pedido para llevar.'),
    });
  }

  protected mas(linea: LineaCarrito) {
    this.carrito.cambiarCantidad(linea.id, 1);
  }

  protected menos(linea: LineaCarrito) {
    this.carrito.cambiarCantidad(linea.id, -1);
  }

  protected quitar(linea: LineaCarrito) {
    this.carrito.quitar(linea.id);
  }

  protected registrar() {
    if (this.enviando() || this.carrito.lineas().length === 0) return;
    const mesaId = this.mesaElegida() ? Number(this.mesaElegida()) : null;
    const paraLlevar = mesaId === null || this.paraLlevar();
    const destino = (mesaId === null
      ? 'en mostrador'
      : `para la mesa ${this.mesas().find((m) => m.mesaId === mesaId)?.numero ?? mesaId}`) + (paraLlevar ? ' (para llevar)' : '');

    this.enviando.set(true);
    this.error.set(null);
    this.registrado.set(null);
    this.pedidoService.registrar({ mesaId, paraLlevar, detalles: this.carrito.aNuevoPedido(0).detalles }).subscribe({
      next: (pedido) => {
        this.enviando.set(false);
        this.carrito.vaciar();
        this.paraLlevar.set(false);
        this.registrado.set({ pedidoId: pedido.pedidoId, destino });
      },
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeError(e, 'No se pudo registrar el pedido. Inténtalo de nuevo.'));
      },
    });
  }
}
