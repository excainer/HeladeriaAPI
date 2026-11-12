import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CarritoService, LineaCarrito, precioUnitario } from '../../core/services/carrito';
import { MesaSesionService } from '../../core/services/mesa-sesion';
import { PedidoService } from '../../core/services/pedido';
import { mensajeError } from '../../core/utils/errores';
import { Pesos } from '../../shared/pipes/pesos';

/** Resumen del pedido: cantidades, opciones elegidas, total y confirmación. */
@Component({
  selector: 'app-carrito',
  imports: [Pesos, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Carrito {
  protected readonly carrito = inject(CarritoService);
  private readonly sesion = inject(MesaSesionService);
  private readonly pedidos = inject(PedidoService);
  private readonly router = inject(Router);

  protected readonly precioUnitario = precioUnitario;
  protected readonly enviando = signal(false);
  /** El cliente elige si lo come en la mesa o se lo empacan para llevar. */
  protected readonly paraLlevar = signal(false);
  protected readonly error = signal<string | null>(null);

  protected mas(linea: LineaCarrito) {
    this.carrito.cambiarCantidad(linea.id, 1);
  }

  protected menos(linea: LineaCarrito) {
    this.carrito.cambiarCantidad(linea.id, -1);
  }

  protected quitar(linea: LineaCarrito) {
    this.carrito.quitar(linea.id);
  }

  /** Envía el pedido. Solo se vacía el carrito si el backend lo aceptó. */
  protected confirmar() {
    const mesa = this.sesion.mesa();
    if (!mesa || this.enviando() || this.carrito.lineas().length === 0) return;

    this.enviando.set(true);
    this.error.set(null);

    this.pedidos.crear({ ...this.carrito.aNuevoPedido(mesa.mesaId), paraLlevar: this.paraLlevar() }).subscribe({
      next: (pedido) => {
        this.carrito.vaciar();
        this.enviando.set(false);
        this.router.navigate(['/pedido', pedido.pedidoId]);
      },
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeError(e, 'No se pudo enviar tu pedido. Inténtalo de nuevo.'));
      },
    });
  }
}
