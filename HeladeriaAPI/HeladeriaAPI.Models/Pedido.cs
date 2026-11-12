

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
        /// Mesa donde se genera el pedido, o null si es para llevar (registrado por el personal).
        /// </summary>
        public int? MesaId { get; set; }

        /// <summary>
        /// Usuario del personal que registró el pedido, o null si lo hizo el cliente desde la mesa.
        /// </summary>
        public int? RegistradoPorId { get; set; }

        /// <summary>
        /// Se empaca para llevar. Siempre es true si no tiene mesa (pedido de mostrador).
        /// </summary>
        public bool ParaLlevar { get; set; }

        /// <summary>
        /// Nombre de quien lo registró (se calcula con la tabla Usuarios; no es una columna).
        /// </summary>
        [Computed]
        public string? RegistradoPor { get; set; }

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