import { Injectable } from '@angular/core';
import { Api } from './api';
import { DatosProducto, Producto } from '../models/producto.model';

@Injectable({
  providedIn: 'root',
})
export class ProductoService {

  private readonly endpoint = 'Productos';

  constructor(private api: Api) { }

  obtenerTodos() {
    return this.api.get<Producto[]>(this.endpoint);
  }

  obtenerPorId(id: number) {
    return this.api.get<Producto>(`${this.endpoint}/${id}`);
  }

  obtenerPorCategoria(categoriaId: number) {
    return this.api.get<Producto[]>(`${this.endpoint}?categoriaId=${categoriaId}`);
  }

  crear(datos: DatosProducto) {
    return this.api.post<Producto>(this.endpoint, datos);
  }

  actualizar(id: number, datos: DatosProducto) {
    return this.api.put<Producto>(`${this.endpoint}/${id}`, datos);
  }

}
