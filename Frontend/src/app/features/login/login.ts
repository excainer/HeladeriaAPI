import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { mensajeError } from '../../core/utils/errores';

/** Ingreso del personal. Los clientes no pasan por aquí: piden sin iniciar sesión. */
@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly volver = inject(ActivatedRoute).snapshot.queryParamMap.get('volver');

  protected readonly usuario = signal('');
  protected readonly clave = signal('');
  protected readonly entrando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected entrar() {
    if (this.entrando()) return;
    const usuario = this.usuario().trim();
    if (!usuario || !this.clave()) {
      this.error.set('Escribe tu usuario y tu contraseña.');
      return;
    }

    this.entrando.set(true);
    this.error.set(null);
    this.auth.iniciarSesion(usuario, this.clave()).subscribe({
      next: () => {
        this.entrando.set(false);
        this.router.navigateByUrl(this.destino());
      },
      error: (e: unknown) => {
        this.entrando.set(false);
        this.clave.set('');
        this.error.set(mensajeError(e, 'No se pudo iniciar sesión. Inténtalo de nuevo.'));
      },
    });
  }

  /** Solo se vuelve a rutas internas del personal (evita redirigir a otro sitio con ?volver=). */
  private destino(): string {
    const v = this.volver;
    return v && v.startsWith('/personal') && !v.startsWith('/personal/login') ? v : '/personal';
  }
}
