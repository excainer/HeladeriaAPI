import { Injectable } from '@angular/core';
import { Api } from './api';
import { Categoria, DatosCategoria } from '../models/categoria.model';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {

  private readonly endpoint = 'Categorias';

  constructor(private api: Api) { }

  obtenerTodos() {
    return this.api.get<Categoria[]>(this.endpoint);
  }

  obtenerPorId(id: number) {
    return this.api.get<Categoria>(`${this.endpoint}/${id}`);
  }

  crear(datos: DatosCategoria) {
    return this.api.post<Categoria>(this.endpoint, datos);
  }

  actualizar(id: number, datos: DatosCategoria) {
    return this.api.put<Categoria>(`${this.endpoint}/${id}`, datos);
  }

}
