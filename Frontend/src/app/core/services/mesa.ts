import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Api } from './api';
import { Mesa } from '../models/mesa.model';

@Injectable({
  providedIn: 'root',
})
export class MesaService {

  private readonly endpoint = 'Mesas';

  constructor(private api: Api) { }

  obtenerTodos() {
    return this.api.get<Mesa[]>(this.endpoint);
  }

  obtenerPorId(id: number) {
    return this.api.get<Mesa>(`${this.endpoint}/${id}`);
  }

  /** Libera la mesa (personal). Falla con 409 si tiene pedidos sin entregar. */
  liberar(id: number) {
    return this.api.post<Mesa>(`${this.endpoint}/${id}/liberar`, {});
  }

  /**
   * Busca la mesa por su número visible (el del código QR), no por su id.
   * Devuelve undefined si no existe; cualquier otro error se propaga.
   */
  obtenerPorNumero(numero: number): Observable<Mesa | undefined> {
    return this.api.get<Mesa>(`${this.endpoint}/numero/${numero}`).pipe(
      catchError((e: unknown) =>
        (e as { status?: number }).status === 404 ? of(undefined) : throwError(() => e)),
    );
  }

}
