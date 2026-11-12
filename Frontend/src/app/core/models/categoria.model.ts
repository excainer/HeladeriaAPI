export interface Categoria {
  categoriaId: number;
  nombre: string;
}

/** Cuerpo de POST/PUT /api/Categorias. */
export type DatosCategoria = Omit<Categoria, 'categoriaId'>;
