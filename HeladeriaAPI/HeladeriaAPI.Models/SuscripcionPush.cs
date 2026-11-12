using System;
using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Suscripción a notificaciones push de un celular que sigue un pedido.
    /// La genera el navegador del cliente (Push API); la API la usa para avisarle cuando el pedido queda listo.
    /// </summary>
    [Table("SuscripcionesPush")]
    public class SuscripcionPush
    {
        /// <summary>
        /// Identificador único de la suscripción.
        /// </summary>
        [Key]
        public int SuscripcionPushId { get; set; }

        /// <summary>
        /// Pedido del que se quiere recibir avisos.
        /// </summary>
        public int PedidoId { get; set; }

        /// <summary>
        /// Dirección del servicio de push del navegador (Google, Mozilla, Apple, Microsoft) a la que se envía el aviso.
        /// </summary>
        public string Endpoint { get; set; } = string.Empty;

        /// <summary>
        /// Clave pública del navegador para cifrar el mensaje (base64url).
        /// </summary>
        public string P256dh { get; set; } = string.Empty;

        /// <summary>
        /// Secreto de autenticación del navegador para cifrar el mensaje (base64url).
        /// </summary>
        public string Auth { get; set; } = string.Empty;

        /// <summary>
        /// Fecha en que el cliente activó los avisos.
        /// </summary>
        [Write(false)]
        public DateTime Fecha { get; set; }
    }
}
