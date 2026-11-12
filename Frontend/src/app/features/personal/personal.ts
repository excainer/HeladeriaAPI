import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Marco de la zona del personal: navegación entre cocina, pedidos y consultas. */
@Component({
  selector: 'app-personal',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './personal.html',
  styleUrl: './personal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Personal {
  protected readonly enlaces = [
    { ruta: 'preparacion', texto: 'Cocina' },
    { ruta: 'pedidos', texto: 'Pedidos' },
    { ruta: 'dashboard', texto: 'Resumen' },
    { ruta: 'productos', texto: 'Productos' },
    { ruta: 'categorias', texto: 'Categorías' },
    { ruta: 'tamanos', texto: 'Tamaños' },
    { ruta: 'mesas', texto: 'Mesas' },
  ];
}
