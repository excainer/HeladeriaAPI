import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Mesa } from '../../core/models/mesa.model';
import { MesaService } from '../../core/services/mesa';
import { MesaSesionService } from '../../core/services/mesa-sesion';
import { mensajeError } from '../../core/utils/errores';

/**
 * Portada de HeladApp. El cliente elige su mesa en la lista, o llega ya con ella
 * por un enlace /mesa/:numero (código QR).
 */
@Component({
  selector: 'app-inicio',
  imports: [],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio {
  private readonly mesaService = inject(MesaService);
  private readonly sesion = inject(MesaSesionService);
  private readonly router = inject(Router);
  private readonly numeroEnRuta = inject(ActivatedRoute).snapshot.paramMap.get('numero');

  protected readonly mesas = signal<Mesa[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);

    this.mesaService.obtenerTodos().subscribe({
      next: (mesas) => {
        this.mesas.set([...mesas].sort((a, b) => a.numero - b.numero));
        this.cargando.set(false);
        if (this.numeroEnRuta != null) this.entrarPorEnlace(this.numeroEnRuta);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e, 'No se pudieron cargar las mesas. Inténtalo de nuevo.'));
      },
    });
  }

  protected elegir(mesa: Mesa) {
    this.sesion.establecer(mesa);
    this.router.navigateByUrl('/menu');
  }

  private entrarPorEnlace(texto: string) {
    const mesa = this.mesas().find((m) => String(m.numero) === texto.trim());
    if (mesa) {
      this.elegir(mesa);
    } else {
      this.error.set(`No encontramos la mesa ${texto}. Elige tu mesa de la lista.`);
    }
  }
}
