export type TipoOpcion = 'Sabor' | 'Topping';

/** Sabor o topping que se puede elegir para los productos de una categoría (GET /api/Opciones). No cambia el precio. */
export interface Opcion {
  opcionId: number;
  categoriaId: number;
  tipo: TipoOpcion;
  nombre: string;
  orden: number;
  activo: boolean;
}

/** Cuerpo de POST/PUT /api/Opciones. */
export type DatosOpcion = Omit<Opcion, 'opcionId'>;
