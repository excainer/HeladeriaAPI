/**
 * Estados que acepta el backend. Ojo: "En Preparacion" se envía SIN tilde,
 * tal como lo valida la API; en pantalla se muestra "En preparación".
 * "Cancelado" está fuera del flujo normal: solo se llega cancelando un pedido pendiente.
 */
export type EstadoPedido = 'Pendiente' | 'En Preparacion' | 'Listo' | 'Entregado' | 'Cancelado';

/** Flujo normal, en orden (sin "Cancelado"). */
export const ESTADOS_PEDIDO: readonly EstadoPedido[] = [
  'Pendiente',
  'En Preparacion',
  'Listo',
  'Entregado',
];

export const ESTADO_CANCELADO: EstadoPedido = 'Cancelado';

/** Todos los estados posibles, para filtros y resúmenes. */
export const TODOS_LOS_ESTADOS: readonly EstadoPedido[] = [...ESTADOS_PEDIDO, ESTADO_CANCELADO];

const ETIQUETAS: Record<EstadoPedido, string> = {
  Pendiente: 'Pendiente',
  'En Preparacion': 'En preparación',
  Listo: 'Listo',
  Entregado: 'Entregado',
  Cancelado: 'Cancelado',
};

/** Texto que se muestra al usuario para un estado. */
export function etiquetaEstado(estado: EstadoPedido): string {
  return ETIQUETAS[estado] ?? estado;
}

/**
 * Siguiente estado en el flujo de cocina, o null si el pedido ya terminó (entregado o cancelado).
 * El backend también valida este orden.
 */
export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  const posicion = ESTADOS_PEDIDO.indexOf(estado);
  return posicion < 0 ? null : ESTADOS_PEDIDO[posicion + 1] ?? null;
}
