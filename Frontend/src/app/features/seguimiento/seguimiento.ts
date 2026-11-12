import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, takeWhile } from 'rxjs';
import { ESTADOS_PEDIDO, EstadoPedido, etiquetaEstado } from '../../core/models/estado-pedido.model';
import { DetallePedido } from '../../core/models/detalle-pedido.model';
import { Pedido } from '../../core/models/pedido.model';
import { CatalogoService } from '../../core/services/catalogo';
import { MesaSesionService } from '../../core/services/mesa-sesion';
import { PedidoService } from '../../core/services/pedido';
import { sondeo } from '../../core/utils/sondeo';
import { Pesos } from '../../shared/pipes/pesos';

const MENSAJES: Record<EstadoPedido, string> = {
  Pendiente: 'Recibimos tu pedido. Pronto empezamos a prepararlo.',
  'En Preparacion': 'Estamos preparando tu pedido.',
  Listo: '¡Tu pedido está listo!',
  Entregado: 'Tu pedido fue entregado. ¡Que lo disfrutes!',
};

/** Seguimiento del pedido del cliente. Se actualiza solo cada 5 segundos hasta que se entrega. */
@Component({
  selector: 'app-seguimiento',
  imports: [Pesos, RouterLink],
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Seguimiento {
  private readonly pedidos = inject(PedidoService);
  private readonly catalogo = inject(CatalogoService);
  private readonly sesion = inject(MesaSesionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly detalles = signal<DetallePedido[]>([]);
  private readonly nombres = signal<Map<number, string>>(new Map());
  private readonly tamanos = signal<Map<number, string>>(new Map());

  protected readonly cargando = signal(true);
  protected readonly noEncontrado = signal(false);
  protected readonly errorConexion = signal(false);

  protected readonly pasos = ESTADOS_PEDIDO.map((valor) => ({ valor, texto: etiquetaEstado(valor) }));
  protected readonly posicion = computed(() => {
    const p = this.pedido();
    return p ? ESTADOS_PEDIDO.indexOf(p.estado) : -1;
  });
  protected readonly mensaje = computed(() => {
    const p = this.pedido();
    return p ? (MENSAJES[p.estado] ?? '') : '';
  });

  constructor() {
    // Nombres de tamaños aparte: si fallan, el pedido igual se muestra (sin el tamaño).
    this.catalogo.nombresTamanos$.subscribe({ next: (m) => this.tamanos.set(m), error: () => undefined });
    const id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      this.cargando.set(false);
      this.noEncontrado.set(true);
      return;
    }
    this.iniciar(id);
  }

  /** "Helado de Vainilla (Grande)", o solo el nombre si no tiene tamaño. */
  protected descripcion(d: DetallePedido): string {
    const tamano = d.tamanoId ? this.tamanos().get(d.tamanoId) : undefined;
    return tamano ? `${this.nombre(d.productoId)} (${tamano})` : this.nombre(d.productoId);
  }

  protected nombre(productoId: number): string {
    return this.nombres().get(productoId) ?? `Producto ${productoId}`;
  }

  private iniciar(id: number) {
    // Los ítems y los nombres no cambian: se piden una sola vez.
    forkJoin({ detalles: this.pedidos.obtenerDetalles(id), nombres: this.catalogo.nombresProductos$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ detalles, nombres }) => {
          this.detalles.set(detalles);
          this.nombres.set(nombres);
        },
        error: () => this.errorConexion.set(true),
      });

    sondeo(() => this.pedidos.obtenerPorId(id))
      .pipe(
        // Cuando el pedido se entrega ya no hay nada más que esperar.
        takeWhile((r) => !(r.ok && r.valor.estado === 'Entregado'), true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((r) => {
        this.cargando.set(false);
        if (r.ok) {
          const mesa = this.sesion.mesa();
          // Un pedido de otra mesa no se muestra.
          if (mesa && r.valor.mesaId !== mesa.mesaId) {
            this.noEncontrado.set(true);
            return;
          }
          this.errorConexion.set(false);
          this.pedido.set(r.valor);
        } else if ((r.error as { status?: number }).status === 404) {
          this.noEncontrado.set(true);
        } else {
          this.errorConexion.set(true);
        }
      });
  }
}
