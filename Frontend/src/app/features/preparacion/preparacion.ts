import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, forkJoin, map, of, switchMap } from 'rxjs';
import { EstadoPedido, etiquetaEstado, siguienteEstado } from '../../core/models/estado-pedido.model';
import { DetallePedido } from '../../core/models/detalle-pedido.model';
import { Pedido } from '../../core/models/pedido.model';
import { CatalogoService } from '../../core/services/catalogo';
import { PedidoService } from '../../core/services/pedido';
import { mensajeError } from '../../core/utils/errores';
import { sondeo } from '../../core/utils/sondeo';
import { haceCuanto } from '../../shared/utils/tiempo';

const COLUMNAS: readonly EstadoPedido[] = ['Pendiente', 'En Preparacion', 'Listo'];

const ACCION: Partial<Record<EstadoPedido, string>> = {
  Pendiente: 'Empezar a preparar',
  'En Preparacion': 'Marcar como listo',
  Listo: 'Marcar como entregado',
};

/** Panel de cocina: pedidos por estado, actualizado cada 5 segundos. */
@Component({
  selector: 'app-preparacion',
  imports: [],
  templateUrl: './preparacion.html',
  styleUrl: './preparacion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Preparacion {
  private readonly pedidosService = inject(PedidoService);
  private readonly catalogo = inject(CatalogoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refrescar = new Subject<void>();

  private readonly pedidos = signal<Pedido[]>([]);
  private readonly detalles = signal<Map<number, DetallePedido[]>>(new Map());
  private readonly nombres = signal<Map<number, string>>(new Map());
  private readonly tamanos = signal<Map<number, string>>(new Map());
  private readonly mesas = signal<Map<number, number>>(new Map());
  private readonly ahora = signal(Date.now());

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal(false);
  protected readonly errorAccion = signal<string | null>(null);
  protected readonly ultimaActualizacion = signal<Date | null>(null);
  protected readonly enCurso = signal<Set<number>>(new Set());

  protected readonly columnas = computed(() =>
    COLUMNAS.map((estado) => ({
      estado,
      titulo: etiquetaEstado(estado),
      accion: ACCION[estado] ?? '',
      // Los más antiguos primero: es el orden de atención.
      pedidos: this.pedidos()
        .filter((p) => p.estado === estado)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
    })));

  constructor() {
    // Nombres de tamaños aparte: si fallan, el pedido igual se muestra (sin el tamaño).
    this.catalogo.nombresTamanos$.subscribe({ next: (m) => this.tamanos.set(m), error: () => undefined });
    forkJoin({ nombres: this.catalogo.nombresProductos$, mesas: this.catalogo.numerosMesa$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: ({ nombres, mesas }) => { this.nombres.set(nombres); this.mesas.set(mesas); } });

    sondeo(() => this.pedidosService.obtenerTodos().pipe(
      switchMap((todos) => {
        const activos = todos.filter((p) => COLUMNAS.includes(p.estado));
        // Los ítems de un pedido no cambian: solo se piden los de pedidos nuevos.
        const nuevos = activos.filter((p) => !this.detalles().has(p.pedidoId));
        if (nuevos.length === 0) return of({ activos, nuevosDetalles: [] as [number, DetallePedido[]][] });
        return forkJoin(nuevos.map((p) => this.pedidosService.obtenerDetalles(p.pedidoId).pipe(
          map((d) => [p.pedidoId, d] as [number, DetallePedido[]])))).pipe(
          map((nuevosDetalles) => ({ activos, nuevosDetalles })));
      })), this.refrescar)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => {
        this.cargando.set(false);
        if (!r.ok) { this.errorCarga.set(true); return; }
        this.errorCarga.set(false);
        if (r.valor.nuevosDetalles.length) {
          this.detalles.update((m) => new Map([...m, ...r.valor.nuevosDetalles]));
        }
        this.pedidos.set(r.valor.activos);
        this.ahora.set(Date.now());
        this.ultimaActualizacion.set(new Date());
      });
  }

  protected mesa(p: Pedido): number | string {
    return this.mesas().get(p.mesaId) ?? p.mesaId;
  }

  protected items(p: Pedido): DetallePedido[] {
    return this.detalles().get(p.pedidoId) ?? [];
  }

  /** "Helado de Vainilla (Grande)", o solo el nombre si no tiene tamaño. */
  protected descripcion(d: DetallePedido): string {
    const tamano = d.tamanoId ? this.tamanos().get(d.tamanoId) : undefined;
    return tamano ? `${this.nombre(d.productoId)} (${tamano})` : this.nombre(d.productoId);
  }

  protected nombre(productoId: number): string {
    return this.nombres().get(productoId) ?? `Producto ${productoId}`;
  }

  protected hace(p: Pedido): string {
    return haceCuanto(p.fecha, this.ahora());
  }

  protected avanzar(p: Pedido) {
    const siguiente = siguienteEstado(p.estado);
    if (!siguiente || this.enCurso().has(p.pedidoId)) return;

    this.enCurso.update((s) => new Set(s).add(p.pedidoId));
    this.errorAccion.set(null);

    this.pedidosService.actualizarEstado(p.pedidoId, siguiente).subscribe({
      next: () => { this.terminar(p.pedidoId); this.refrescar.next(); },
      error: (e: unknown) => {
        this.terminar(p.pedidoId);
        this.errorAccion.set(mensajeError(e, 'No se pudo cambiar el estado del pedido.'));
        // Si otro dispositivo ya lo cambió (409), se recarga la lista para mostrar el estado real.
        this.refrescar.next();
      },
    });
  }

  private terminar(id: number) {
    this.enCurso.update((s) => { const n = new Set(s); n.delete(id); return n; });
  }
}
