
using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Ítem individual del pedido, incluyendo configuraciones específicas (sabores, toppings, observaciones).
    /// </summary>
    [Table("DetallesPedido")]
    public class DetallePedido
    {
        /// <summary>
        /// Identificador único del detalle.
        /// </summary>
        [Key]
        public int DetallePedidoId { get; set; }

        /// <summary>
        /// Identificador del pedido al que pertenece.
        /// </summary>
        public int PedidoId { get; set; }

        /// <summary>
        /// Identificador del producto base/tamaño seleccionado.
        /// </summary>
        public int ProductoId { get; set; }

        /// <summary>
        /// Tamaño elegido, o null si la categoría del producto no maneja tamaños.
        /// </summary>
        public int? TamanoId { get; set; }

        /// <summary>
        /// Cantidad solicitada del producto.
        /// </summary>
        public int Cantidad { get; set; }

        /// <summary>
        /// Sabores elegidos (ej. "Vainilla, Chocolate").
        /// </summary>
        public string? Sabores { get; set; }

        /// <summary>
        /// Toppings o adicionales (ej. "Chispas, Maní").
        /// </summary>
        public string? Toppings { get; set; }

        /// <summary>
        /// Especificaciones del cliente (ej. "Sin crema").
        /// </summary>
        public string? Observaciones { get; set; }

        /// <summary>
        /// Precio calculado por unidad de este detalle (precio del producto + adicional del tamaño).
        /// </summary>
        public decimal PrecioUnitario { get; set; }
    }
}
