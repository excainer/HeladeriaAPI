import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { Usuario } from '../../core/models/usuario.model';
import { Personal } from './personal';

const usuario = (rol: Usuario['rol']): Usuario =>
  ({ usuarioId: 1, nombreUsuario: 'laura', nombre: 'Laura', rol, activo: true });

describe('Personal', () => {
  let http: HttpTestingController;

  async function crear(rol: Usuario['rol']) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).iniciarSesion('laura', 'x').subscribe();
    http.expectOne('/api/Auth/login').flush(usuario(rol));
    const f = TestBed.createComponent(Personal);
    await f.whenStable();
    return f;
  }

  const enlaces = (el: HTMLElement) =>
    Array.from<HTMLElement>(el.querySelectorAll('nav a')).map((a) => a.textContent!.trim());

  it('muestra al administrador todas las secciones', async () => {
    const f = await crear('Administrador');
    expect(enlaces(f.nativeElement)).toEqual(['Cocina', 'Nuevo pedido', 'Pedidos', 'Resumen', 'Productos', 'Categorías', 'Tamaños', 'Sabores y toppings', 'Mesas', 'Usuarios']);
  });

  it('al empleado le oculta la administración del catálogo y de usuarios', async () => {
    const f = await crear('Empleado');
    expect(enlaces(f.nativeElement)).toEqual(['Cocina', 'Nuevo pedido', 'Pedidos', 'Resumen', 'Mesas']);
  });

  it('muestra quién tiene la sesión y permite salir', async () => {
    const f = await crear('Empleado');
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.cuenta')!.textContent).toContain('Laura');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (el.querySelector('.salir') as HTMLButtonElement).click();
    http.expectOne('/api/Auth/logout').flush(null, { status: 204, statusText: 'No Content' });
    await f.whenStable();
    expect(TestBed.inject(AuthService).usuario()).toBeNull();
    expect(navegar).toHaveBeenCalledWith(['/personal/login']);
  });
});
