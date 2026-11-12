import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import { DatosTamano, Tamano } from '../models/tamano.model';

@Injectable({
  providedIn: 'root',
})
export class TamanoService {
  private readonly api = inject(Api);
  private readonly endpoint = 'Tamanos';

  /** Todos los tamaños, activos e inactivos, ordenados por categoría y orden. */
  obtenerTodos() {
    return this.api.get<Tamano[]>(this.endpoint);
  }

  crear(datos: DatosTamano) {
    return this.api.post<Tamano>(this.endpoint, datos);
  }

  actualizar(id: number, datos: DatosTamano) {
    return this.api.put<Tamano>(`${this.endpoint}/${id}`, datos);
  }
}
