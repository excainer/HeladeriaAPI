import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { Mesa } from '../../core/models/mesa.model';
import { MesaService } from '../../core/services/mesa';
import { mensajeError } from '../../core/utils/errores';
import { sondeo } from '../../core/utils/sondeo';

/**
 * Mesas del local con su ocupación. El estado lo calcula la API a partir de los pedidos
 * (ocupada mientras tenga pedidos sin entregar) y la pantalla se actualiza cada 5 segundos.
 */
@Component({
  selector: 'app-mesas',
  imports: [],
  templateUrl: './mesas.html',
  styleUrl: './mesas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Mesas {
  private readonly mesaService = inject(MesaService);
  private readonly refrescar = new Subject<void>();

  protected readonly mesas = signal<Mesa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly ocupadas = computed(() => this.mesas().filter((m) => this.estaOcupada(m)).length);

  constructor() {
    sondeo(() => this.mesaService.obtenerTodos(), this.refrescar)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((r) => {
        this.cargando.set(false);
        if (r.ok) {
          this.error.set(null);
          this.mesas.set([...r.valor].sort((a, b) => a.numero - b.numero));
        } else {
          this.error.set(mensajeError(r.error, 'No se pudieron cargar las mesas.'));
        }
      });
  }

  protected cargar() {
    this.refrescar.next();
  }

  protected estaOcupada(m: Mesa): boolean {
    return (m.pedidosActivos ?? 0) > 0 || m.estado === 'Ocupada';
  }

  protected detalle(m: Mesa): string {
    const n = m.pedidosActivos ?? 0;
    return n === 0 ? '' : n === 1 ? '1 pedido en curso' : `${n} pedidos en curso`;
  }
}
