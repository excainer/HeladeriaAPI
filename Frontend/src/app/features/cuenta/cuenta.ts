import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth';
import { mensajeError } from '../../core/utils/errores';

/** Datos del usuario con sesión y cambio de su contraseña. */
@Component({
  selector: 'app-cuenta',
  imports: [],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cuenta {
  protected readonly auth = inject(AuthService);

  protected readonly actual = signal('');
  protected readonly nueva = signal('');
  protected readonly confirmacion = signal('');
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected cambiar() {
    if (this.guardando()) return;
    this.aviso.set(null);
    if (!this.actual()) return this.error.set('Escribe tu contraseña actual.');
    if (this.nueva().length < 8) return this.error.set('La contraseña nueva debe tener al menos 8 caracteres.');
    if (this.nueva() !== this.confirmacion()) return this.error.set('La confirmación no coincide con la contraseña nueva.');
    if (this.nueva() === this.actual()) return this.error.set('La contraseña nueva debe ser distinta de la actual.');

    this.guardando.set(true);
    this.error.set(null);
    this.auth.cambiarClave(this.actual(), this.nueva()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.actual.set('');
        this.nueva.set('');
        this.confirmacion.set('');
        this.aviso.set('Contraseña cambiada.');
      },
      error: (e: unknown) => {
        this.guardando.set(false);
        this.error.set(mensajeError(e, 'No se pudo cambiar la contraseña.'));
      },
    });
  }
}
