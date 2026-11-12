/**
 * Los sabores y toppings se administran en la base de datos (GET /api/Opciones, página
 * "Sabores y toppings" del personal) y no cambian el precio.
 *
 * La base de datos incluye además una categoría "Toppings" con productos con precio.
 * Como los toppings se eligen sin costo dentro de la personalización,
 * esa categoría no se muestra en el menú del cliente.
 */
export const CATEGORIA_EXTRAS = 'Toppings';
