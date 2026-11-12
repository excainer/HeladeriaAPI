import { Routes } from '@angular/router';
import { mesaGuard } from './core/guards/mesa';
import { administradorGuard, personalGuard } from './core/guards/personal';

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

  // Ingreso del personal (los clientes no inician sesión).
  {
    path: 'personal/login',
    title: 'Ingreso del personal · HeladApp',
    loadComponent: () =>
      import('./features/login/login').then(m => m.Login)
  },

  // Zona del personal: exige sesión. Lo marcado con administradorGuard es solo para administradores.
  {
    path: 'personal',
    canActivate: [personalGuard],
    loadComponent: () =>
      import('./features/personal/personal').then(m => m.Personal),
    children: [
      { path: '', redirectTo: 'preparacion', pathMatch: 'full' },
      {
        path: 'preparacion',
        title: 'Cocina · HeladApp',
        loadComponent: () =>
          import('./features/preparacion/preparacion').then(m => m.Preparacion)
      },
      {
        path: 'nuevo-pedido',
        title: 'Nuevo pedido · HeladApp',
        loadComponent: () =>
          import('./features/registrar-pedido/registrar-pedido').then(m => m.RegistrarPedido)
      },
      {
        path: 'pedidos',
        title: 'Pedidos · HeladApp',
        loadComponent: () =>
          import('./features/pedidos/pedidos').then(m => m.Pedidos)
      },
      {
        path: 'dashboard',
        title: 'Resumen · HeladApp',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'mesas',
        title: 'Mesas · HeladApp',
        loadComponent: () =>
          import('./features/mesas/mesas').then(m => m.Mesas)
      },
      {
        path: 'cuenta',
        title: 'Mi cuenta · HeladApp',
        loadComponent: () =>
          import('./features/cuenta/cuenta').then(m => m.Cuenta)
      },
      {
        path: 'productos',
        title: 'Productos · HeladApp',
        canActivate: [administradorGuard],
        loadComponent: () =>
          import('./features/productos/productos').then(m => m.Productos)
      },
      {
        path: 'categorias',
        title: 'Categorías · HeladApp',
        canActivate: [administradorGuard],
        loadComponent: () =>
          import('./features/categorias/categorias').then(m => m.Categorias)
      },
      {
        path: 'tamanos',
        title: 'Tamaños · HeladApp',
        canActivate: [administradorGuard],
        loadComponent: () =>
          import('./features/tamanos/tamanos').then(m => m.Tamanos)
      },
      {
        path: 'usuarios',
        title: 'Usuarios · HeladApp',
        canActivate: [administradorGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios').then(m => m.Usuarios)
      }
    ]
  },

  {
    path: '**',
    redirectTo: ''
  }
];
