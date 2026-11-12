import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPedido, etiquetaEstado } from '../../../core/models/estado-pedido.model';

/** Etiqueta de color con el estado de un pedido. El texto siempre acompaña al color. */
@Component({
  selector: 'app-estado',
  template: `<span class="estado" [class]="clase()">{{ texto() }}</span>`,
  styles: `
    .estado { display: inline-block; padding: 0 var(--espacio-3); border-radius: var(--radio-pildora); font-weight: 700; font-size: var(--texto-pequeno); background: var(--blanco); border: 2px solid var(--tinta); }
    .Pendiente { background: var(--estado-pendiente); border-color: transparent; }
    .EnPreparacion { background: var(--estado-preparacion); border-color: transparent; }
    .Listo { background: var(--estado-listo); border-color: transparent; }
    .Cancelado { background: var(--blanco); border-style: dashed; text-decoration: line-through; opacity: 0.75; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Estado {
  readonly valor = input.required<EstadoPedido>();
  protected readonly texto = computed(() => etiquetaEstado(this.valor()));
  protected readonly clase = computed(() => 'estado ' + this.valor().replace(' ', ''));
}
