import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Categoria } from '../../core/models/categoria.model';
import { DatosOpcion, Opcion, TipoOpcion } from '../../core/models/opcion.model';
import { CategoriaService } from '../../core/services/categoria';
import { OpcionService } from '../../core/services/opcion';
import { mensajeError } from '../../core/utils/errores';

const ORDEN_TIPOS: TipoOpcion[] = ['Sabor', 'Topping'];

/**
 * Administración de sabores y toppings por categoría. Si una categoría tiene opciones activas,
 * el cliente puede elegirlas al pedir sus productos. No cambian el precio.
 */
@Component({
  selector: 'app-opciones',
  templateUrl: './opciones.html',
  styleUrl: './opciones.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Opciones {
  private readonly opcionService = inject(OpcionService);
  private readonly categoriaService = inject(CategoriaService);

  protected readonly tipos = ORDEN_TIPOS;

  private readonly opciones = signal<Opcion[]>([]);
  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Formulario: null = cerrado, 0 = opción nueva, otro número = id que se edita.
  protected readonly editando = signal<number | null>(null);
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly tipo = signal<TipoOpcion>('Sabor');
  protected readonly nombre = signal('');
  protected readonly orden = signal('1');
  protected readonly activo = signal(true);
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  /** Opciones agrupadas por categoría (en el orden de las categorías), luego por tipo y por orden. */
  protected readonly filas = computed(() => {
    const posicion = new Map(this.categorias().map((c, i) => [c.categoriaId, i] as const));
    return [...this.opciones()]
      .sort((a, b) =>
        (posicion.get(a.categoriaId) ?? 999) - (posicion.get(b.categoriaId) ?? 999) ||
        ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo) ||
        a.orden - b.orden)
      .map((o) => ({
        ...o,
        categoria: this.categorias().find((c) => c.categoriaId === o.categoriaId)?.nombre ?? `Categoría ${o.categoriaId}`,
      }));
  });

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ opciones: this.opcionService.obtenerTodos(), categorias: this.categoriaService.obtenerTodos() }).subscribe({
      next: ({ opciones, categorias }) => {
        this.opciones.set(opciones);
        this.categorias.set(categorias);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los sabores y toppings.'));
        this.cargando.set(false);
      },
    });
  }

  protected nuevo(tipo: TipoOpcion) {
    const categoriaId = this.categorias()[0]?.categoriaId ?? null;
    this.abrir(0, categoriaId, tipo, '', String(this.siguienteOrden(categoriaId, tipo)), true);
  }

  protected editar(o: Opcion) {
    this.abrir(o.opcionId, o.categoriaId, o.tipo, o.nombre, String(o.orden), o.activo);
  }

  protected cambiarCategoria(valor: string) {
    this.categoriaId.set(Number(valor));
    this.sugerirOrden();
  }

  protected cambiarTipo(valor: string) {
    this.tipo.set(valor as TipoOpcion);
    this.sugerirOrden();
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
    const orden = Number(this.orden() || 0);
    if (!nombre) return this.errorFormulario.set(`Escribe el nombre del ${this.etiqueta(this.tipo())}.`);
    // El pedido guarda los nombres elegidos separados por coma.
    if (nombre.includes(',')) return this.errorFormulario.set('El nombre no puede llevar comas.');
    if (categoriaId === null) return this.errorFormulario.set('Elige una categoría.');
    if (!Number.isInteger(orden) || orden < 0) return this.errorFormulario.set('El orden debe ser un número entero.');

    this.enviar(id, { categoriaId, tipo: this.tipo(), nombre, orden, activo: this.activo() });
  }

  protected alternarActivo(o: Opcion) {
    if (this.guardando()) return;
    this.enviar(o.opcionId, {
      categoriaId: o.categoriaId,
      tipo: o.tipo,
      nombre: o.nombre,
      orden: o.orden,
      activo: !o.activo,
    }, false);
  }

  protected etiqueta(tipo: TipoOpcion): string {
    return tipo === 'Sabor' ? 'sabor' : 'topping';
  }

  private enviar(id: number, datos: DatosOpcion, desdeFormulario = true) {
    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.aviso.set(null);

    const peticion = id === 0 ? this.opcionService.crear(datos) : this.opcionService.actualizar(id, datos);
    peticion.subscribe({
      next: (guardada) => {
        this.opciones.update((lista) =>
          id === 0 ? [...lista, guardada] : lista.map((o) => (o.opcionId === id ? guardada : o)));
        this.guardando.set(false);
        if (desdeFormulario) this.editando.set(null);
        const que = guardada.tipo === 'Sabor' ? 'Sabor' : 'Topping';
        this.aviso.set(`${que} "${guardada.nombre}" ${id === 0 ? 'creado' : 'actualizado'}.`);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        const mensaje = mensajeError(e, `No se pudo guardar el ${this.etiqueta(datos.tipo)}.`);
        if (desdeFormulario) this.errorFormulario.set(mensaje);
        else this.aviso.set(mensaje);
      },
    });
  }

  /** En una opción nueva se sugiere ponerla al final de su categoría y tipo. */
  private sugerirOrden() {
    if (this.editando() === 0) this.orden.set(String(this.siguienteOrden(this.categoriaId(), this.tipo())));
  }

  private siguienteOrden(categoriaId: number | null, tipo: TipoOpcion): number {
    const ordenes = this.opciones()
      .filter((o) => o.categoriaId === categoriaId && o.tipo === tipo)
      .map((o) => o.orden);
    return ordenes.length ? Math.max(...ordenes) + 1 : 1;
  }

  private abrir(id: number, categoriaId: number | null, tipo: TipoOpcion, nombre: string, orden: string, activo: boolean) {
    this.editando.set(id);
    this.categoriaId.set(categoriaId);
    this.tipo.set(tipo);
    this.nombre.set(nombre);
    this.orden.set(orden);
    this.activo.set(activo);
    this.errorFormulario.set(null);
    this.aviso.set(null);
  }
}
