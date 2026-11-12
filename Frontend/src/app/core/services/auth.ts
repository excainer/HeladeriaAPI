import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { Api } from './api';
import { CatalogoService } from './catalogo';
import { Usuario } from '../models/usuario.model';

/**
 * Sesión del personal. La API guarda la sesión en una cookie HttpOnly que el navegador envía solo,
 * así que aquí no se maneja ningún token: solo se recuerda quién es el usuario para la interfaz.
 * Los clientes nunca inician sesión.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(Api);
  private readonly catalogo = inject(CatalogoService);

  private readonly _usuario = signal<Usuario | null>(null);
  private verificado = false;
  private verificando$?: Observable<Usuario | null>;

  readonly usuario = this._usuario.asReadonly();
  readonly esAdministrador = computed(() => this._usuario()?.rol === 'Administrador');

  /**
   * Devuelve el usuario con sesión, preguntándole a la API solo la primera vez
   * (o después de que la sesión se pierda). null = no hay sesión.
   */
  verificar(): Observable<Usuario | null> {
    if (this.verificado) return of(this._usuario());
    return (this.verificando$ ??= this.api.get<Usuario>('Auth/yo').pipe(
      catchError((e: unknown) => ((e as { status?: number }).status === 401 ? of(null) : throwError(() => e))),
      tap((usuario) => {
        this._usuario.set(usuario);
        this.verificado = true;
      }),
      finalize(() => (this.verificando$ = undefined)),
      shareReplay({ bufferSize: 1, refCount: false }),
    ));
  }

  iniciarSesion(nombreUsuario: string, clave: string): Observable<Usuario> {
    return this.api.post<Usuario>('Auth/login', { nombreUsuario, clave }).pipe(
      tap((usuario) => {
        this._usuario.set(usuario);
        this.verificado = true;
      }),
    );
  }

  cerrarSesion(): Observable<void> {
    return this.api.post<void>('Auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.limpiar()),
      map(() => undefined),
    );
  }

  cambiarClave(claveActual: string, claveNueva: string): Observable<void> {
    return this.api.put<void>('Auth/clave', { claveActual, claveNueva });
  }

  /** Olvida la sesión en el navegador (por ejemplo, cuando la API responde 401). */
  limpiar() {
    this._usuario.set(null);
    this.verificado = true;
    this.catalogo.invalidar();
  }
}
