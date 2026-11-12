
using System;
using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Punto de atención o mesa para la toma de pedidos.
    /// </summary>
    [Table("Mesas")]
    public class Mesa
    {
        /// <summary>
        /// Identificador único de la mesa.
        /// </summary>
        [Key]
        public int MesaId { get; set; }

        /// <summary>
        /// Número o identificador visible de la mesa.
        /// </summary>
        public int Numero { get; set; }

        /// <summary>
        /// Estado actual: "Ocupada" desde el primer pedido hasta que el personal la libera; si no, el guardado (ej. Disponible).
        /// </summary>
        public string Estado { get; set; } = string.Empty;

        /// <summary>
        /// Última vez que el personal liberó la mesa (null si nunca).
        /// </summary>
        public DateTime? LiberadaEn { get; set; }

        /// <summary>
        /// Pedidos de la mesa que todavía no se han entregado (se calcula, no es una columna).
        /// </summary>
        [Computed]
        public int PedidosActivos { get; set; }

        /// <summary>
        /// Pedidos hechos desde la última liberación, entregados o no (se calcula).
        /// </summary>
        [Computed]
        public int PedidosDesdeLiberacion { get; set; }

        /// <summary>
        /// La mesa está ocupada pero todo fue entregado: el personal ya puede liberarla.
        /// </summary>
        [Computed]
        public bool PuedeLiberarse => PedidosActivos == 0 && PedidosDesdeLiberacion > 0;
    }
}