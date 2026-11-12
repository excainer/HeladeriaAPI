import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Categoria } from '../../core/models/categoria.model';
import { DatosTamano, Tamano } from '../../core/models/tamano.model';
import { CatalogoService } from '../../core/services/catalogo';
import { CategoriaService } from '../../core/services/categoria';
import { TamanoService } from '../../core/services/tamano';
import { mensajeError } from '../../core/utils/errores';
import { Pesos } from '../../shared/pipes/pesos';

/**
 * Administración de tamaños por categoría. Si una categoría tiene tamaños activos,
 * el cliente debe elegir uno al pedir sus productos; el adicional se suma al precio base.
 */
@Component({
  selector: 'app-tamanos',
  imports: [Pesos],
  templateUrl: './tamanos.html',
  styleUrl: './tamanos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tamanos {
  private readonly tamanoService = inject(TamanoService);
  private readonly categoriaService = inject(CategoriaService);
  private readonly catalogo = inject(CatalogoService);

  private readonly tamanos = signal<Tamano[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Formulario: null = cerrado, 0 = tamaño nuevo, otro número = id que se edita.
  protected readonly editando = signal<number | null>(null);
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly nombre = signal('');
  protected readonly adicional = signal('0');
  protected readonly orden = signal('1');
  protected readonly activo = signal(true);
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  /** Tamaños agrupados por categoría (en el orden de las categorías) y por su orden. */
  protected readonly filas = computed(() => {
    const posicion = new Map(this.categorias().map((c, i) => [c.categoriaId, i] as const));
    return [...this.tamanos()]
      .sort((a, b) =>
        (posicion.get(a.categoriaId) ?? 999) - (posicion.get(b.categoriaId) ?? 999) || a.orden - b.orden)
      .map((t) => ({
        ...t,
        categoria: this.categorias().find((c) => c.categoriaId === t.categoriaId)?.nombre ?? `Categoría ${t.categoriaId}`,
      }));
  });

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ tamanos: this.tamanoService.obtenerTodos(), categorias: this.categoriaService.obtenerTodos() }).subscribe({
      next: ({ tamanos, categorias }) => {
        this.tamanos.set(tamanos);
        this.categorias.set(categorias);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los tamaños.'));
        this.cargando.set(false);
      },
    });
  }

  protected nuevo() {
    const categoriaId = this.categorias()[0]?.categoriaId ?? null;
    this.abrir(0, categoriaId, '', '0', String(this.siguienteOrden(categoriaId)), true);
  }

  protected editar(t: Tamano) {
    this.abrir(t.tamanoId, t.categoriaId, t.nombre, String(t.precioAdicional), String(t.orden), t.activo);
  }

  protected cambiarCategoria(valor: string) {
    this.categoriaId.set(Number(valor));
    // En un tamaño nuevo se sugiere ponerlo al final de su categoría.
    if (this.editando() === 0) this.orden.set(String(this.siguienteOrden(Number(valor))));
  }

  protected cancelar() {
    this.editando.set(null);
    this.errorFormulario.set(null);
  }

  protected guardar() {
    const id = this.editando();
    if (id === null || this.guardando()) return;

    const nombre = this.nombre().trim();
    const categoriaId = this.categoriaId();
    const precioAdicional = Number(this.adicional() || 0);
    const orden = Number(this.orden() || 0);
    if (!nombre) return this.errorFormulario.set('Escribe el nombre del tamaño.');
    if (categoriaId === null) return this.errorFormulario.set('Elige una categoría.');
    if (!Number.isFinite(precioAdicional) || precioAdicional < 0) {
      return this.errorFormulario.set('El precio adicional no puede ser negativo.');
    }
    if (!Number.isInteger(orden) || orden < 0) return this.errorFormulario.set('El orden debe ser un número entero.');

    this.enviar(id, { categoriaId, nombre, precioAdicional, orden, activo: this.activo() });
  }

  protected alternarActivo(t: Tamano) {
    if (this.guardando()) return;
    this.enviar(t.tamanoId, {
      categoriaId: t.categoriaId,
      nombre: t.nombre,
      precioAdicional: t.precioAdicional,
      orden: t.orden,
      activo: !t.activo,
    }, false);
  }

  private enviar(id: number, datos: DatosTamano, desdeFormulario = true) {
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.aviso.set(null);

    const peticion = id === 0 ? this.tamanoService.crear(datos) : this.tamanoService.actualizar(id, datos);
    peticion.subscribe({
      next: (guardado) => {
        this.tamanos.update((lista) =>
          id === 0 ? [...lista, guardado] : lista.map((t) => (t.tamanoId === id ? guardado : t)));
        this.catalogo.invalidar();
        this.guardando.set(false);
        if (desdeFormulario) this.editando.set(null);
        this.aviso.set(id === 0 ? `Tamaño "${guardado.nombre}" creado.` : `Tamaño "${guardado.nombre}" actualizado.`);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        const mensaje = mensajeError(e, 'No se pudo guardar el tamaño.');
        if (desdeFormulario) this.errorFormulario.set(mensaje);
        else this.aviso.set(mensaje);
      },
    });
  }

  private siguienteOrden(categoriaId: number | null): number {
    const ordenes = this.tamanos().filter((t) => t.categoriaId === categoriaId).map((t) => t.orden);
    return ordenes.length ? Math.max(...ordenes) + 1 : 1;
  }

  private abrir(id: number, categoriaId: number | null, nombre: string, adicional: string, orden: string, activo: boolean) {
    this.editando.set(id);
    this.categoriaId.set(categoriaId);
    this.nombre.set(nombre);
    this.adicional.set(adicional);
    this.orden.set(orden);
    this.activo.set(activo);
    this.errorFormulario.set(null);
    this.aviso.set(null);
  }
}
