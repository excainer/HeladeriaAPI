import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import { CambiosUsuario, NuevoUsuario, Usuario } from '../models/usuario.model';

/** Usuarios del personal (solo administradores). */
@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private readonly api = inject(Api);
  private readonly endpoint = 'Usuarios';

  obtenerTodos() {
    return this.api.get<Usuario[]>(this.endpoint);
  }

  crear(datos: NuevoUsuario) {
    return this.api.post<Usuario>(this.endpoint, datos);
  }

  actualizar(id: number, cambios: CambiosUsuario) {
    return this.api.put<Usuario>(`${this.endpoint}/${id}`, cambios);
  }
}
