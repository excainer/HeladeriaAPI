import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Categoria } from '../../core/models/categoria.model';
import { Producto } from '../../core/models/producto.model';
import { Tamano } from '../../core/models/tamano.model';
import { CatalogoService } from '../../core/services/catalogo';
import { CategoriaService } from '../../core/services/categoria';
import { ProductoService } from '../../core/services/producto';
import { TamanoService } from '../../core/services/tamano';
import { mensajeError } from '../../core/utils/errores';

/** Administración de categorías (RF10): listar con su cantidad de productos y tamaños, crear y renombrar. */
@Component({
  selector: 'app-categorias',
  imports: [],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Categorias {
  private readonly categoriaService = inject(CategoriaService);
  private readonly productoService = inject(ProductoService);
  private readonly tamanoService = inject(TamanoService);
  private readonly catalogo = inject(CatalogoService);

  private readonly categorias = signal<Categoria[]>([]);
  private readonly productos = signal<Producto[]>([]);
  private readonly tamanos = signal<Tamano[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Formulario: null = cerrado, 0 = categoría nueva, otro número = id que se edita.
  protected readonly editando = signal<number | null>(null);
  protected readonly nombre = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly filas = computed(() =>
    this.categorias().map((c) => ({
      ...c,
      cantidad: this.productos().filter((p) => p.categoriaId === c.categoriaId).length,
      tamanos: this.tamanos().filter((t) => t.categoriaId === c.categoriaId && t.activo).length,
    })));

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ categorias: this.categoriaService.obtenerTodos(), productos: this.productoService.obtenerTodos() }).subscribe({
      next: ({ categorias, productos }) => {
        this.categorias.set(categorias);
        this.productos.set(productos);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar las categorías.'));
        this.cargando.set(false);
      },
    });
    // El conteo de tamaños es informativo: si falla, la tabla se muestra igual.
    this.tamanoService.obtenerTodos().subscribe({ next: (t) => this.tamanos.set(t), error: () => undefined });
  }

  protected nueva() {
    this.abrir(0, '');
  }

  protected editar(c: Categoria) {
    this.abrir(c.categoriaId, c.nombre);
  }

  protected cancelar() {
    this.editando.set(null);
    this.errorFormulario.set(null);
  }

  protected guardar() {
    const id = this.editando();
    if (id === null || this.guardando()) return;
    const nombre = this.nombre().trim();
    if (!nombre) return this.errorFormulario.set('Escribe el nombre de la categoría.');

    this.guardando.set(true);
    this.errorFormulario.set(null);
    const peticion = id === 0
      ? this.categoriaService.crear({ nombre })
      : this.categoriaService.actualizar(id, { nombre });

    peticion.subscribe({
      next: (guardada) => {
        this.categorias.update((lista) =>
          id === 0 ? [...lista, guardada] : lista.map((c) => (c.categoriaId === id ? guardada : c)));
        this.catalogo.invalidar();
        this.guardando.set(false);
        this.editando.set(null);
        this.aviso.set(id === 0 ? `Categoría "${guardada.nombre}" creada.` : `Categoría renombrada a "${guardada.nombre}".`);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(e, 'No se pudo guardar la categoría.'));
      },
    });
  }

  private abrir(id: number, nombre: string) {
    this.editando.set(id);
    this.nombre.set(nombre);
    this.errorFormulario.set(null);
    this.aviso.set(null);
  }
}
