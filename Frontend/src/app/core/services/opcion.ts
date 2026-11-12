import { Injectable, inject } from '@angular/core';
import { Api } from './api';
import { DatosOpcion, Opcion } from '../models/opcion.model';

/** Sabores y toppings por categoría. */
@Injectable({
  providedIn: 'root',
})
export class OpcionService {
  private readonly api = inject(Api);
  private readonly endpoint = 'Opciones';

  /** Todos los sabores y toppings, activos e inactivos, ordenados por categoría, tipo y orden. */
  obtenerTodos() {
    return this.api.get<Opcion[]>(this.endpoint);
  }

  crear(datos: DatosOpcion) {
    return this.api.post<Opcion>(this.endpoint, datos);
  }

  actualizar(id: number, datos: DatosOpcion) {
    return this.api.put<Opcion>(`${this.endpoint}/${id}`, datos);
  }
}
