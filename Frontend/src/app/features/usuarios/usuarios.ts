import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Rol, Usuario } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth';
import { UsuarioService } from '../../core/services/usuario';
import { mensajeError } from '../../core/utils/errores';

/** Administración de los usuarios del personal: crear, cambiar rol, activar/desactivar y restablecer contraseña. */
@Component({
  selector: 'app-usuarios',
  imports: [],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Usuarios {
  private readonly usuarioService = inject(UsuarioService);
  protected readonly auth = inject(AuthService);

  protected readonly roles: readonly Rol[] = ['Empleado', 'Administrador'];
  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // Formulario: null = cerrado, 0 = usuario nuevo, otro número = id que se edita.
  protected readonly editando = signal<number | null>(null);
  protected readonly nombreUsuario = signal('');
  protected readonly nombre = signal('');
  protected readonly rol = signal<Rol>('Empleado');
  protected readonly activo = signal(true);
  protected readonly clave = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorFormulario = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.usuarioService.obtenerTodos().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los usuarios.'));
        this.cargando.set(false);
      },
    });
  }

  protected esYo(u: Usuario): boolean {
    return u.usuarioId === this.auth.usuario()?.usuarioId;
  }

  protected nuevo() {
    this.abrir(0, '', '', 'Empleado', true);
  }

  protected editar(u: Usuario) {
    this.abrir(u.usuarioId, u.nombreUsuario, u.nombre, u.rol, u.activo);
  }

  protected cancelar() {
    this.editando.set(null);
    this.errorFormulario.set(null);
  }

  protected guardar() {
    const id = this.editando();
    if (id === null || this.guardando()) return;

    const nombre = this.nombre().trim();
    const nombreUsuario = this.nombreUsuario().trim();
    const clave = this.clave();
    if (id === 0 && !/^[A-Za-z0-9._-]{3,50}$/.test(nombreUsuario)) {
      return this.errorFormulario.set('El usuario debe tener de 3 a 50 letras, números, punto, guion o guion bajo, sin espacios.');
    }
    if (!nombre) return this.errorFormulario.set('Escribe el nombre del trabajador.');
    if ((id === 0 || clave) && clave.length < 8) {
      return this.errorFormulario.set('La contraseña debe tener al menos 8 caracteres.');
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.aviso.set(null);
    const peticion = id === 0
      ? this.usuarioService.crear({ nombreUsuario, nombre, clave, rol: this.rol() })
      : this.usuarioService.actualizar(id, { nombre, rol: this.rol(), activo: this.activo(), claveNueva: clave || null });

    peticion.subscribe({
      next: (guardado) => {
        this.usuarios.update((lista) =>
          id === 0 ? [...lista, guardado] : lista.map((u) => (u.usuarioId === id ? guardado : u)));
        this.guardando.set(false);
        this.editando.set(null);
        this.aviso.set(id === 0
          ? `Usuario "${guardado.nombreUsuario}" creado. Entrégale su contraseña inicial y pídele que la cambie en "Mi cuenta".`
          : `Usuario "${guardado.nombreUsuario}" actualizado.`);
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(e, 'No se pudo guardar el usuario.'));
      },
    });
  }

  private abrir(id: number, nombreUsuario: string, nombre: string, rol: Rol, activo: boolean) {
    this.editando.set(id);
    this.nombreUsuario.set(nombreUsuario);
    this.nombre.set(nombre);
    this.rol.set(rol);
    this.activo.set(activo);
    this.clave.set('');
    this.errorFormulario.set(null);
    this.aviso.set(null);
  }
}
