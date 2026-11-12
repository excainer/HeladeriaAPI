import { Routes } from '@angular/router';
import { mesaGuard } from './core/guards/mesa';

export const routes: Routes = [
  // Zona del cliente: entra por la mesa (QR o número) y llega hasta el seguimiento.
  {
    path: '',
    loadComponent: () =>
      import('./features/cliente/cliente').then(m => m.Cliente),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/inicio/inicio').then(m => m.Inicio)
      },
      {
        path: 'mesa/:numero',
        loadComponent: () =>
          import('./features/inicio/inicio').then(m => m.Inicio)
      },
      {
        path: 'menu',
        canActivate: [mesaGuard],
        loadComponent: () =>
          import('./features/menu/menu').then(m => m.Menu)
      },
      {
        path: 'carrito',
        canActivate: [mesaGuard],
        loadComponent: () =>
          import('./features/carrito/carrito').then(m => m.Carrito)
      },
      {
        path: 'pedido/:id',
        canActivate: [mesaGuard],
        loadComponent: () =>
          import('./features/seguimiento/seguimiento').then(m => m.Seguimiento)
      }
    ]
  },

  // Zona del personal.
  {
    path: 'personal',
    loadComponent: () =>
      import('./features/personal/personal').then(m => m.Personal),
    children: [
      { path: '', redirectTo: 'preparacion', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./features/productos/productos').then(m => m.Productos)
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./features/categorias/categorias').then(m => m.Categorias)
      },
      {
        path: 'tamanos',
        loadComponent: () =>
          import('./features/tamanos/tamanos').then(m => m.Tamanos)
      },
      {
        path: 'mesas',
        loadComponent: () =>
          import('./features/mesas/mesas').then(m => m.Mesas)
      },
      {
        path: 'pedidos',
        loadComponent: () =>
          import('./features/pedidos/pedidos').then(m => m.Pedidos)
      },
      {
        path: 'preparacion',
        loadComponent: () =>
          import('./features/preparacion/preparacion').then(m => m.Preparacion)
      }
    ]
  },

  {
    path: '**',
    redirectTo: ''
  }
];
