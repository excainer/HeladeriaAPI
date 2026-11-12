

using System;
using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Cabecera del pedido tomado por el personal de atención.
    /// </summary>
    [Table("Pedidos")]
    public class Pedido
    {
        /// <summary>
        /// Identificador único del pedido.
        /// </summary>
        [Key]
        public int PedidoId { get; set; }

        /// <summary>
        /// Mesa o punto donde se genera el pedido.
        /// </summary>
        public int MesaId { get; set; }

        /// <summary>
        /// Fecha y hora exacta de registro.
        /// </summary>
        public DateTime Fecha { get; set; }

        /// <summary>
        /// Estado del flujo de preparación (Pendiente, En Preparacion, Listo, Entregado) o Cancelado.
        /// </summary>
        public string Estado { get; set; } = string.Empty;

        /// <summary>
        /// Valor total del pedido.
        /// </summary>
        public decimal Total { get; set; }
    }
}