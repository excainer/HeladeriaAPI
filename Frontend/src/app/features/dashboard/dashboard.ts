import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TODOS_LOS_ESTADOS, etiquetaEstado } from '../../core/models/estado-pedido.model';
import { Pedido } from '../../core/models/pedido.model';
import { Producto } from '../../core/models/producto.model';
import { MesaService } from '../../core/services/mesa';
import { PedidoService } from '../../core/services/pedido';
import { ProductoService } from '../../core/services/producto';
import { mensajeError } from '../../core/utils/errores';
import { Pesos } from '../../shared/pipes/pesos';

/** Resumen general (solo lectura), calculado con lo que devuelve la API. */
@Component({
  selector: 'app-dashboard',
  imports: [Pesos],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly pedidoService = inject(PedidoService);
  private readonly productoService = inject(ProductoService);
  private readonly mesaService = inject(MesaService);

  private readonly pedidos = signal<Pedido[]>([]);
  private readonly productos = signal<Producto[]>([]);
  protected readonly cantidadMesas = signal(0);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalPedidos = computed(() => this.pedidos().length);
  protected readonly productosDisponibles = computed(() => this.productos().filter((p) => p.activo).length);
  /** Solo cuenta los pedidos ya entregados. */
  protected readonly ventas = computed(() =>
    this.pedidos().filter((p) => p.estado === 'Entregado').reduce((suma, p) => suma + p.total, 0));
  protected readonly porEstado = computed(() =>
    TODOS_LOS_ESTADOS.map((estado) => ({
      estado,
      texto: etiquetaEstado(estado),
      cantidad: this.pedidos().filter((p) => p.estado === estado).length,
    })));

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      pedidos: this.pedidoService.obtenerTodos(),
      productos: this.productoService.obtenerTodos(),
      mesas: this.mesaService.obtenerTodos(),
    }).subscribe({
      next: ({ pedidos, productos, mesas }) => {
        this.pedidos.set(pedidos);
        this.productos.set(productos);
        this.cantidadMesas.set(mesas.length);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudo cargar el resumen.'));
        this.cargando.set(false);
      },
    });
  }
}
