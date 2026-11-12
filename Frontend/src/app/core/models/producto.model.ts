export interface Producto {
  productoId: number;
  categoriaId: number;
  nombre: string;
  precio: number;
  activo: boolean;
}

/** Cuerpo de POST/PUT /api/Productos. */
export type DatosProducto = Omit<Producto, 'productoId'>;
