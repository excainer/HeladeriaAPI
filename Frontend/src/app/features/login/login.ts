import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Usuario } from '../../core/models/usuario.model';
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

  // Sesión que ya existía en este navegador (por ejemplo, abierta en otra pestaña).
  protected readonly revisando = signal(true);
  protected readonly sesionAbierta = signal<Usuario | null>(null);
  protected readonly cerrando = signal(false);

  constructor() {
    this.auth.verificar().subscribe({
      next: (u) => {
        this.sesionAbierta.set(u);
        this.revisando.set(false);
      },
      // Si la API no responde se muestra el formulario; el error aparecerá al intentar entrar.
      error: () => this.revisando.set(false),
    });
  }

  protected continuar() {
    this.router.navigateByUrl(this.destino());
  }

  /** Cierra la sesión abierta y muestra el formulario para entrar con otro usuario. */
  protected otraCuenta() {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    this.auth.cerrarSesion().subscribe(() => {
      this.cerrando.set(false);
      this.sesionAbierta.set(null);
    });
  }

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
