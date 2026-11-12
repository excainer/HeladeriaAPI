import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { EstadoPedido, TODOS_LOS_ESTADOS, etiquetaEstado } from '../../core/models/estado-pedido.model';
import { DetallePedido } from '../../core/models/detalle-pedido.model';
import { Mesa } from '../../core/models/mesa.model';
import { Pedido } from '../../core/models/pedido.model';
import { CatalogoService } from '../../core/services/catalogo';
import { MesaService } from '../../core/services/mesa';
import { PedidoService } from '../../core/services/pedido';
import { mensajeError } from '../../core/utils/errores';
import { Estado } from '../../shared/components/estado/estado';
import { Pesos } from '../../shared/pipes/pesos';

/** Historial de pedidos (solo lectura) con filtros por estado y por mesa. */
@Component({
  selector: 'app-pedidos',
  imports: [DatePipe, Estado, Pesos],
  templateUrl: './pedidos.html',
  styleUrl: './pedidos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pedidos {
  private readonly pedidosService = inject(PedidoService);
  private readonly mesaService = inject(MesaService);
  private readonly catalogo = inject(CatalogoService);

  protected readonly estados = TODOS_LOS_ESTADOS.map((valor) => ({ valor, texto: etiquetaEstado(valor) }));

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly mesas = signal<Mesa[]>([]);
  private readonly nombres = signal<Map<number, string>>(new Map());
  private readonly tamanos = signal<Map<number, string>>(new Map());

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly filtroEstado = signal<EstadoPedido | null>(null);
  /** null = todas; 'llevar' = solo para llevar; número = una mesa. */
  protected readonly filtroMesa = signal<number | 'llevar' | null>(null);

  protected readonly abierto = signal<number | null>(null);
  protected readonly detalles = signal<DetallePedido[]>([]);
  protected readonly cargandoDetalles = signal(false);
  protected readonly errorDetalles = signal(false);

  protected readonly visibles = computed(() =>
    this.pedidos().filter((p) =>
      (this.filtroEstado() === null || p.estado === this.filtroEstado()) &&
      (this.filtroMesa() === null ||
       (this.filtroMesa() === 'llevar' ? p.mesaId === null : p.mesaId === this.filtroMesa()))));

  constructor() {
    // Nombres de tamaños aparte: si fallan, el pedido igual se muestra (sin el tamaño).
    this.catalogo.nombresTamanos$.subscribe({ next: (m) => this.tamanos.set(m), error: () => undefined });
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      pedidos: this.pedidosService.obtenerTodos(),
      mesas: this.mesaService.obtenerTodos(),
      nombres: this.catalogo.nombresProductos$,
    }).subscribe({
      next: ({ pedidos, mesas, nombres }) => {
        this.pedidos.set(pedidos);
        this.mesas.set(mesas);
        this.nombres.set(nombres);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los pedidos.'));
        this.cargando.set(false);
      },
    });
  }

  /** "Mesa 3" o "Para llevar". */
  protected etiquetaMesa(mesaId: number | null): string {
    return mesaId === null ? 'Para llevar' : `Mesa ${this.mesas().find((m) => m.mesaId === mesaId)?.numero ?? mesaId}`;
  }

  /** "Helado de Vainilla (Grande)", o solo el nombre si no tiene tamaño. */
  protected descripcion(d: DetallePedido): string {
    const tamano = d.tamanoId ? this.tamanos().get(d.tamanoId) : undefined;
    return tamano ? `${this.nombre(d.productoId)} (${tamano})` : this.nombre(d.productoId);
  }

  protected nombre(productoId: number): string {
    return this.nombres().get(productoId) ?? `Producto ${productoId}`;
  }

  protected elegirEstado(estado: EstadoPedido | null) {
    this.filtroEstado.set(estado);
  }

  protected elegirMesa(valor: string) {
    this.filtroMesa.set(valor === '' ? null : valor === 'llevar' ? 'llevar' : Number(valor));
  }

  protected alternarDetalle(p: Pedido) {
    if (this.abierto() === p.pedidoId) {
      this.abierto.set(null);
      return;
    }
    this.abierto.set(p.pedidoId);
    this.detalles.set([]);
    this.errorDetalles.set(false);
    this.cargandoDetalles.set(true);
    this.pedidosService.obtenerDetalles(p.pedidoId).subscribe({
      next: (d) => {
        // Si mientras tanto se abrió otro pedido, se ignora esta respuesta.
        if (this.abierto() !== p.pedidoId) return;
        this.detalles.set(d);
        this.cargandoDetalles.set(false);
      },
      error: () => {
        if (this.abierto() !== p.pedidoId) return;
        this.errorDetalles.set(true);
        this.cargandoDetalles.set(false);
      },
    });
  }
}
