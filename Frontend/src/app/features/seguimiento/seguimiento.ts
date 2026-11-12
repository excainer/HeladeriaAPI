import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, forkJoin, takeWhile } from 'rxjs';
import { ESTADOS_PEDIDO, EstadoPedido, etiquetaEstado } from '../../core/models/estado-pedido.model';
import { DetallePedido } from '../../core/models/detalle-pedido.model';
import { Pedido } from '../../core/models/pedido.model';
import { CatalogoService } from '../../core/services/catalogo';
import { MesaSesionService } from '../../core/services/mesa-sesion';
import { PedidoService } from '../../core/services/pedido';
import { SonidoService } from '../../core/services/sonido';
import { sondeo } from '../../core/utils/sondeo';
import { Pesos } from '../../shared/pipes/pesos';

const MENSAJES: Record<EstadoPedido, string> = {
  Pendiente: 'Recibimos tu pedido. Pronto empezamos a prepararlo.',
  'En Preparacion': 'Estamos preparando tu pedido.',
  Listo: '¡Tu pedido está listo!',
  Entregado: 'Tu pedido fue entregado. ¡Que lo disfrutes!',
  Cancelado: 'Tu pedido fue cancelado. Si crees que es un error, avísale al personal.',
};

const TITULO = 'Tu pedido · HeladApp';

/** Estados finales: ya no hay nada más que esperar. */
const FINALES: readonly EstadoPedido[] = ['Entregado', 'Cancelado'];

/**
 * Seguimiento del pedido del cliente. Se actualiza cada 3 segundos hasta que se entrega o se cancela.
 * Cuando queda listo avisa con sonido, vibración (Android), título de la pestaña y un aviso grande.
 */
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
  private readonly sonido = inject(SonidoService);
  private readonly titulo = inject(Title);

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly detalles = signal<DetallePedido[]>([]);
  private readonly nombres = signal<Map<number, string>>(new Map());
  private readonly tamanos = signal<Map<number, string>>(new Map());

  protected readonly cargando = signal(true);
  protected readonly noEncontrado = signal(false);
  protected readonly errorConexion = signal(false);
  /**
   * Aviso grande: "listo" cuando el pedido pasa a Listo mientras se espera; "entregado" si el
   * celular estuvo dormido y al volver el pedido ya había pasado de largo hasta Entregado.
   */
  protected readonly aviso = signal<'listo' | 'entregado' | null>(null);
  private readonly refrescar = new Subject<void>();
  private readonly documento = inject(DOCUMENT);
  protected readonly cancelado = computed(() => this.pedido()?.estado === 'Cancelado');

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

    // Al desbloquear el celular o volver a la pestaña se consulta de inmediato
    // (mientras la página está oculta, el navegador la congela y no consulta).
    const alVolver = () => { if (!this.documento.hidden) this.refrescar.next(); };
    this.documento.addEventListener('visibilitychange', alVolver);
    this.documento.defaultView?.addEventListener('focus', alVolver);
    this.destroyRef.onDestroy(() => {
      this.documento.removeEventListener('visibilitychange', alVolver);
      this.documento.defaultView?.removeEventListener('focus', alVolver);
      this.titulo.setTitle('HeladApp');
    });
  }

  protected cerrarAviso() {
    this.aviso.set(null);
    this.titulo.setTitle(TITULO);
  }

  /**
   * Avisa cuando el pedido pasa de "en espera" (pendiente o en preparación) a Listo, o directo a
   * Entregado si el celular no alcanzó a ver el Listo. No avisa si ya estaba así al abrir la página.
   */
  private avisarSiCambio(anterior: Pedido | null, actual: Pedido) {
    const esperando = (e: EstadoPedido) => e === 'Pendiente' || e === 'En Preparacion';
    // Si la página se recargó (el celular se durmió o el navegador descartó la pestaña),
    // se usa el último estado que esta pestaña alcanzó a ver.
    const estadoAnterior = anterior?.estado ?? this.leerEstadoVisto(actual.pedidoId);
    this.guardarEstadoVisto(actual);
    if (!estadoAnterior || !esperando(estadoAnterior)) {
      // Si el aviso de "listo" estaba abierto y luego se entregó, se cierra solo.
      if (this.aviso() === 'listo' && actual.estado === 'Entregado') this.cerrarAviso();
      return;
    }
    if (actual.estado !== 'Listo' && actual.estado !== 'Entregado') return;
    this.sonido.pedidoListo();
    this.sonido.vibrar();
    this.aviso.set(actual.estado === 'Listo' ? 'listo' : 'entregado');
    this.titulo.setTitle(actual.estado === 'Listo' ? '✅ ¡Tu pedido está listo!' : '✅ ¡Tu pedido fue entregado!');
  }

  private leerEstadoVisto(pedidoId: number): EstadoPedido | null {
    try {
      return sessionStorage.getItem(`heladapp.pedido.${pedidoId}.visto`) as EstadoPedido | null;
    } catch {
      return null;
    }
  }

  private guardarEstadoVisto(p: Pedido) {
    try {
      sessionStorage.setItem(`heladapp.pedido.${p.pedidoId}.visto`, p.estado);
    } catch {
      // Sin almacenamiento: solo se avisa mientras la página no se recargue.
    }
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

    // Cada 3 segundos, y de inmediato al volver a la página.
    sondeo(() => this.pedidos.obtenerPorId(id), this.refrescar, 3000)
      .pipe(
        // Cuando el pedido se entrega o se cancela ya no hay nada más que esperar.
        takeWhile((r) => !(r.ok && FINALES.includes(r.valor.estado)), true),
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
          this.avisarSiCambio(this.pedido(), r.valor);
          if (!this.aviso()) this.titulo.setTitle(TITULO);
          this.pedido.set(r.valor);
        } else if ((r.error as { status?: number }).status === 404) {
          this.noEncontrado.set(true);
        } else {
          this.errorConexion.set(true);
        }
      });
  }
}
