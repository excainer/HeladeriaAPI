import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  CATEGORIA_EXTRAS,
  CATEGORIA_PERSONALIZABLE,
  SABORES,
  TOPPINGS,
} from '../../core/constants/opciones-producto';
import { ApiError } from '../../core/models/api-error.model';
import { Categoria } from '../../core/models/categoria.model';
import { Producto } from '../../core/models/producto.model';
import { Tamano } from '../../core/models/tamano.model';
import { CarritoService } from '../../core/services/carrito';
import { CategoriaService } from '../../core/services/categoria';
import { ProductoService } from '../../core/services/producto';
import { TamanoService } from '../../core/services/tamano';
import { Pesos } from '../../shared/pipes/pesos';

const mismoNombre = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Menú por categorías. Los productos cuya categoría tiene tamaños obligan a elegir uno;
 * los helados además se pueden personalizar con sabores, toppings y notas.
 */
@Component({
  selector: 'app-menu',
  imports: [Pesos, RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Menu {
  private readonly categoriaService = inject(CategoriaService);
  private readonly productoService = inject(ProductoService);
  private readonly tamanoService = inject(TamanoService);
  protected readonly carrito = inject(CarritoService);

  protected readonly sabores = SABORES;
  protected readonly toppings = TOPPINGS;

  private readonly categorias = signal<Categoria[]>([]);
  private readonly productos = signal<Producto[]>([]);
  private readonly tamanos = signal<Tamano[]>([]);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly categoriaActiva = signal<number | null>(null);

  // Panel de opciones abierto (un producto a la vez).
  protected readonly abierto = signal<number | null>(null);
  protected readonly tamanoElegido = signal<number | null>(null);
  protected readonly saboresElegidos = signal<string[]>([]);
  protected readonly toppingsElegidos = signal<string[]>([]);
  protected readonly notas = signal('');

  // Mensaje para lectores de pantalla cuando se agrega algo al pedido.
  protected readonly aviso = signal('');

  /** Solo se muestran las categorías que tienen al menos un producto disponible. */
  protected readonly categoriasConProductos = computed(() =>
    this.categorias().filter((c) => this.productos().some((p) => p.categoriaId === c.categoriaId)));

  protected readonly productosVisibles = computed(() =>
    this.productos().filter((p) => p.categoriaId === this.categoriaActiva()));

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);

    forkJoin({
      categorias: this.categoriaService.obtenerTodos(),
      productos: this.productoService.obtenerTodos(),
      tamanos: this.tamanoService.obtenerTodos(),
    }).subscribe({
      next: ({ categorias, productos, tamanos }) => {
        const visibles = categorias.filter((c) => !mismoNombre(c.nombre, CATEGORIA_EXTRAS));
        const idsVisibles = new Set(visibles.map((c) => c.categoriaId));

        this.categorias.set(visibles);
        // El backend devuelve también los productos inactivos y los de la categoría de extras;
        // el cliente no debe verlos.
        this.productos.set(productos.filter((p) => p.activo && idsVisibles.has(p.categoriaId)));
        this.tamanos.set(tamanos.filter((t) => t.activo).sort((a, b) => a.orden - b.orden));
        this.categoriaActiva.set(this.categoriasConProductos()[0]?.categoriaId ?? null);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(e instanceof ApiError ? e.message : 'No se pudo cargar el menú.');
        this.cargando.set(false);
      },
    });
  }

  protected elegirCategoria(categoriaId: number) {
    this.categoriaActiva.set(categoriaId);
    this.cerrarPanel();
  }

  protected esPersonalizable(producto: Producto): boolean {
    const categoria = this.categorias().find((c) => c.categoriaId === producto.categoriaId);
    return !!categoria && mismoNombre(categoria.nombre, CATEGORIA_PERSONALIZABLE);
  }

  /** Tamaños activos de la categoría del producto, en su orden. */
  protected tamanosDe(producto: Producto): Tamano[] {
    return this.tamanos().filter((t) => t.categoriaId === producto.categoriaId);
  }

  /** Precio más bajo posible del producto (con el tamaño más barato). */
  protected precioDesde(producto: Producto): number {
    const adicionales = this.tamanosDe(producto).map((t) => t.precioAdicional);
    return producto.precio + (adicionales.length ? Math.min(...adicionales) : 0);
  }

  /** Precio con el tamaño elegido en el panel. */
  protected precioElegido(producto: Producto): number {
    const tamano = this.tamanosDe(producto).find((t) => t.tamanoId === this.tamanoElegido());
    return producto.precio + (tamano?.precioAdicional ?? 0);
  }

  /** Diferencia de precio de un tamaño frente al más barato, para mostrar "+$2.000". */
  protected diferencia(producto: Producto, tamano: Tamano): number {
    return producto.precio + tamano.precioAdicional - this.precioDesde(producto);
  }

  protected alternarPanel(producto: Producto) {
    if (this.abierto() === producto.productoId) {
      this.cerrarPanel();
      return;
    }
    this.cerrarPanel();
    this.abierto.set(producto.productoId);
    // Se preselecciona el primer tamaño para que agregar sea un solo toque.
    this.tamanoElegido.set(this.tamanosDe(producto)[0]?.tamanoId ?? null);
  }

  protected elegirTamano(tamano: Tamano) {
    this.tamanoElegido.set(tamano.tamanoId);
  }

  /** Marca o desmarca una opción, manteniendo el orden de la lista original. */
  protected alternarOpcion(elegidas: WritableSignal<string[]>, opcion: string, orden: readonly string[]) {
    elegidas.update((actuales) =>
      (actuales.includes(opcion) ? actuales.filter((o) => o !== opcion) : [...actuales, opcion])
        .sort((a, b) => orden.indexOf(a) - orden.indexOf(b)));
  }

  protected escribirNotas(texto: string) {
    this.notas.set(texto);
  }

  protected agregarDirecto(producto: Producto) {
    this.carrito.agregar({ producto });
    this.anunciar(producto);
  }

  protected agregarDesdePanel(producto: Producto) {
    const tamano = this.tamanosDe(producto).find((t) => t.tamanoId === this.tamanoElegido()) ?? null;
    const personalizable = this.esPersonalizable(producto);
    this.carrito.agregar({
      producto,
      tamano,
      sabores: personalizable ? this.saboresElegidos() : [],
      toppings: personalizable ? this.toppingsElegidos() : [],
      observaciones: this.notas(),
    });
    this.anunciar(producto, tamano);
    this.cerrarPanel();
  }

  private cerrarPanel() {
    this.abierto.set(null);
    this.tamanoElegido.set(null);
    this.saboresElegidos.set([]);
    this.toppingsElegidos.set([]);
    this.notas.set('');
  }

  private anunciar(producto: Producto, tamano?: Tamano | null) {
    const nombre = tamano ? `${producto.nombre} (${tamano.nombre})` : producto.nombre;
    this.aviso.set(`Agregado: ${nombre}. Productos en tu pedido: ${this.carrito.cantidadTotal()}.`);
  }
}
