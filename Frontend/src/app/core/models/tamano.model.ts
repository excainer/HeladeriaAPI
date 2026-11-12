/** Tamaño que se puede elegir para los productos de una categoría (GET /api/Tamanos). */
export interface Tamano {
  tamanoId: number;
  categoriaId: number;
  nombre: string;
  /** Se suma al precio base del producto. */
  precioAdicional: number;
  orden: number;
  activo: boolean;
}

/** Cuerpo de POST/PUT /api/Tamanos. */
export type DatosTamano = Omit<Tamano, 'tamanoId'>;
