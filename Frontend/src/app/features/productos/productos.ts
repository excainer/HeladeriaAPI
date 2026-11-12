import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Categoria } from '../../core/models/categoria.model';
import { DatosProducto, Producto } from '../../core/models/producto.model';
import { CatalogoService } from '../../core/services/catalogo';
import { CategoriaService } from '../../core/services/categoria';
import { ProductoService } from '../../core/services/producto';
import { mensajeError } from '../../core/utils/errores';
import { Pesos } from '../../shared/pipes/pesos';

/**
 * Administración de productos (RF10): listar, crear, editar y activar/desactivar.
 * No se borran productos: se desactivan, para no perder el histórico de pedidos.
 */
@Component({
  selector: 'app-productos',
  imports: [Pesos],
  templateUrl: './productos.html',
  styleUrl: './productos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Productos {
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly catalogo = inject(CatalogoService);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Formulario: null = cerrado, 0 = producto nuevo, otro número = id que se edita.
  protected readonly editando = signal<number | null>(null);
  protected readonly nombre = signal('');
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly precio = signal('');
  protected readonly activo = signal(true);
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly filas = computed(() =>
    this.productos().map((p) => ({
      ...p,
      categoria: this.categorias().find((c) => c.categoriaId === p.categoriaId)?.nombre ?? `Categoría ${p.categoriaId}`,
    })));

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ productos: this.productoService.obtenerTodos(), categorias: this.categoriaService.obtenerTodos() }).subscribe({
      next: ({ productos, categorias }) => {
        this.productos.set(productos);
        this.categorias.set(categorias);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los productos.'));
        this.cargando.set(false);
      },
    });
  }

  protected nuevo() {
    this.abrir(0, '', this.categorias()[0]?.categoriaId ?? null, '', true);
  }

  protected editar(p: Producto) {
    this.abrir(p.productoId, p.nombre, p.categoriaId, String(p.precio), p.activo);
  }

  protected cancelar() {
    this.editando.set(null);
    this.errorFormulario.set(null);
  }

  protected guardar() {
    const id = this.editando();
    if (id === null || this.guardando()) return;

    const nombre = this.nombre().trim();
    const precio = Number(this.precio());
    const categoriaId = this.categoriaId();
    if (!nombre) return this.errorFormulario.set('Escribe el nombre del producto.');
    if (categoriaId === null) return this.errorFormulario.set('Elige una categoría.');
    if (!Number.isFinite(precio) || precio <= 0) return this.errorFormulario.set('El precio debe ser mayor que cero.');

    this.enviar(id, { nombre, categoriaId, precio, activo: this.activo() });
  }

  /** Activa o desactiva un producto sin abrir el formulario. */
  protected alternarActivo(p: Producto) {
    if (this.guardando()) return;
    this.enviar(p.productoId, { nombre: p.nombre, categoriaId: p.categoriaId, precio: p.precio, activo: !p.activo }, false);
  }

  private enviar(id: number, datos: DatosProducto, desdeFormulario = true) {
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.aviso.set(null);

    const peticion = id === 0 ? this.productoService.crear(datos) : this.productoService.actualizar(id, datos);
    peticion.subscribe({
      next: (guardado) => {
        this.productos.update((lista) =>
          id === 0 ? [...lista, guardado] : lista.map((p) => (p.productoId === id ? guardado : p)));
        this.catalogo.invalidar();
        this.guardando.set(false);
        if (desdeFormulario) this.editando.set(null);
        this.aviso.set(id === 0 ? `Producto "${guardado.nombre}" creado.` : `Producto "${guardado.nombre}" actualizado.`);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        const mensaje = mensajeError(e, 'No se pudo guardar el producto.');
        if (desdeFormulario) this.errorFormulario.set(mensaje);
        else this.aviso.set(mensaje);
      },
    });
  }

  private abrir(id: number, nombre: string, categoriaId: number | null, precio: string, activo: boolean) {
    this.editando.set(id);
    this.nombre.set(nombre);
    this.categoriaId.set(categoriaId);
    this.precio.set(precio);
    this.activo.set(activo);
    this.errorFormulario.set(null);
    this.aviso.set(null);
  }
}
