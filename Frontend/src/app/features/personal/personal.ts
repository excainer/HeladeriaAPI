import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth';

interface Enlace {
  ruta: string;
  texto: string;
  soloAdministrador?: boolean;
}

const ENLACES: readonly Enlace[] = [
  { ruta: 'preparacion', texto: 'Cocina' },
  { ruta: 'nuevo-pedido', texto: 'Nuevo pedido' },
  { ruta: 'pedidos', texto: 'Pedidos' },
  { ruta: 'dashboard', texto: 'Resumen' },
  { ruta: 'productos', texto: 'Productos', soloAdministrador: true },
  { ruta: 'categorias', texto: 'Categorías', soloAdministrador: true },
  { ruta: 'tamanos', texto: 'Tamaños', soloAdministrador: true },
  { ruta: 'mesas', texto: 'Mesas' },
  { ruta: 'usuarios', texto: 'Usuarios', soloAdministrador: true },
];

/** Marco de la zona del personal (con sesión): navegación según el rol, cuenta y salida. */
@Component({
  selector: 'app-personal',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './personal.html',
  styleUrl: './personal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Personal {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly saliendo = signal(false);
  protected readonly enlaces = computed(() =>
    ENLACES.filter((e) => !e.soloAdministrador || this.auth.esAdministrador()));

  protected salir() {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    this.auth.cerrarSesion().subscribe(() => {
      this.saliendo.set(false);
      this.router.navigate(['/personal/login']);
    });
  }
}
