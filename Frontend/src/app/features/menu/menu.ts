import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CATEGORIA_EXTRAS } from '../../core/constants/opciones-producto';
import { ApiError } from '../../core/models/api-error.model';
import { Categoria } from '../../core/models/categoria.model';
import { Opcion } from '../../core/models/opcion.model';
import { Producto } from '../../core/models/producto.model';
import { Tamano } from '../../core/models/tamano.model';
import { CarritoService } from '../../core/services/carrito';
import { CategoriaService } from '../../core/services/categoria';
import { OpcionService } from '../../core/services/opcion';
import { ProductoService } from '../../core/services/producto';
import { TamanoService } from '../../core/services/tamano';
import { Pesos } from '../../shared/pipes/pesos';

const mismoNombre = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Menú por categorías. Los productos cuya categoría tiene tamaños obligan a elegir uno;
 * si la categoría tiene sabores o toppings activos, también se pueden personalizar.
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
  private readonly opcionService = inject(OpcionService);
  protected readonly carrito = inject(CarritoService);

  /** Dentro de "Nuevo pedido" del personal: sin título ni barra de "Ver pedido" (el carrito va al lado). */
  readonly modoPersonal = input(false);

  private readonly categorias = signal<Categoria[]>([]);
  private readonly productos = signal<Producto[]>([]);
  private readonly tamanos = signal<Tamano[]>([]);
  private readonly opciones = signal<Opcion[]>([]);

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
      opciones: this.opcionService.obtenerTodos(),
    }).subscribe({
      next: ({ categorias, productos, tamanos, opciones }) => {
        const visibles = categorias.filter((c) => !mismoNombre(c.nombre, CATEGORIA_EXTRAS));
        const idsVisibles = new Set(visibles.map((c) => c.categoriaId));

        this.categorias.set(visibles);
        // El backend devuelve también los productos inactivos y los de la categoría de extras;
        // el cliente no debe verlos.
        this.productos.set(productos.filter((p) => p.activo && idsVisibles.has(p.categoriaId)));
        this.tamanos.set(tamanos.filter((t) => t.activo).sort((a, b) => a.orden - b.orden));
        this.opciones.set(opciones.filter((o) => o.activo).sort((a, b) => a.orden - b.orden));
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

  /** Nombres de los sabores activos de la categoría del producto, en su orden. */
  protected saboresDe(producto: Producto): string[] {
    return this.opcionesDe(producto, 'Sabor');
  }

  /** Nombres de los toppings activos de la categoría del producto, en su orden. */
  protected toppingsDe(producto: Producto): string[] {
    return this.opcionesDe(producto, 'Topping');
  }

  protected esPersonalizable(producto: Producto): boolean {
    return this.opciones().some((o) => o.categoriaId === producto.categoriaId);
  }

  private opcionesDe(producto: Producto, tipo: Opcion['tipo']): string[] {
    return this.opciones()
      .filter((o) => o.categoriaId === producto.categoriaId && o.tipo === tipo)
      .map((o) => o.nombre);
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
