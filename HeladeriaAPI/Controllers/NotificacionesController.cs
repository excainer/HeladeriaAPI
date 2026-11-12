using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Notificaciones;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Notificaciones push para el cliente: su celular le avisa cuando el pedido está listo,
    /// aunque haya cerrado la app o bloqueado la pantalla.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class NotificacionesController : ControllerBase
    {
        /// <summary>Máximo de celulares que pueden esperar aviso de un mismo pedido.</summary>
        public const int MaximoPorPedido = 5;

        /// <summary>Estados en los que todavía tiene sentido pedir aviso.</summary>
        private static readonly string[] EstadosEnEspera = { "Pendiente", "En Preparacion" };

        /// <summary>
        /// Servicios de push de los navegadores. La API solo envía avisos a estas direcciones,
        /// para que nadie la use para hacer peticiones a otros servidores.
        /// </summary>
        private static readonly string[] ServiciosPermitidos =
        {
            "fcm.googleapis.com",                 // Chrome, Edge en Android, Opera, Samsung Internet
            "android.googleapis.com",
            "updates.push.services.mozilla.com",  // Firefox
            ".push.apple.com",                    // Safari (macOS e iPhone con la app en la pantalla de inicio)
            ".notify.windows.com",                // Edge en Windows
        };

        private readonly ClavesPush _claves;
        private readonly IPedidoQueries _pedidoQueries;
        private readonly ISuscripcionPushRepository _repositorio;

        public NotificacionesController(
            ClavesPush claves,
            IPedidoQueries pedidoQueries,
            ISuscripcionPushRepository repositorio)
        {
            _claves = claves;
            _pedidoQueries = pedidoQueries;
            _repositorio = repositorio;
        }

        /// <summary>
        /// Clave pública VAPID que el navegador necesita para suscribirse (<c>applicationServerKey</c>).
        /// </summary>
        /// <response code="200">Devuelve la clave pública en base64url.</response>
        [HttpGet("clave-publica")]
        [ProducesResponseType(typeof(ClavePublicaResponse), StatusCodes.Status200OK)]
        public IActionResult ObtenerClavePublica()
        {
            return Ok(new ClavePublicaResponse { ClavePublica = _claves.Publica });
        }

        /// <summary>
        /// Suscribe un celular para recibir un aviso cuando el pedido quede listo (o si se cancela).
        /// El cuerpo es el resultado de <c>PushSubscription.toJSON()</c> del navegador.
        /// Si el mismo celular se suscribe de nuevo, se actualiza (no se duplica).
        /// </summary>
        /// <param name="pedidoId">Pedido del que se quiere recibir aviso.</param>
        /// <param name="solicitud">Suscripción del navegador.</param>
        /// <response code="204">Listo: el celular recibirá el aviso.</response>
        /// <response code="400">La suscripción no es válida o no es de un servicio de push conocido.</response>
        /// <response code="404">No existe el pedido.</response>
        /// <response code="409">El pedido ya está listo, entregado o cancelado, o ya tiene el máximo de celulares suscritos.</response>
        [HttpPost("pedidos/{pedidoId:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Suscribir(int pedidoId, [FromBody] SuscripcionRequest solicitud)
        {
            if (!EsServicioPermitido(solicitud.Endpoint))
                return BadRequest("La dirección de la suscripción no es de un servicio de push conocido.");

            if (!ClaveValida(solicitud.Keys.P256dh, 65) || !ClaveValida(solicitud.Keys.Auth, 16))
                return BadRequest("Las claves de la suscripción no son válidas.");

            var pedido = await _pedidoQueries.ObtenerPorIdAsync(pedidoId);
            if (pedido is null) return NotFound();

            if (!EstadosEnEspera.Contains(pedido.Estado))
                return Conflict($"El pedido ya está \"{pedido.Estado}\": no hay nada que avisar.");

            var guardada = await _repositorio.GuardarAsync(new SuscripcionPush
            {
                PedidoId = pedidoId,
                Endpoint = solicitud.Endpoint,
                P256dh = solicitud.Keys.P256dh,
                Auth = solicitud.Keys.Auth
            }, MaximoPorPedido);

            if (!guardada)
                return Conflict($"Este pedido ya tiene {MaximoPorPedido} celulares esperando el aviso.");

            return NoContent();
        }

        private static bool EsServicioPermitido(string endpoint)
        {
            if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
                return false;
            var host = uri.Host.ToLowerInvariant();
            return ServiciosPermitidos.Any(s => s.StartsWith('.') ? host.EndsWith(s) : host == s);
        }

        private static bool ClaveValida(string valor, int bytes)
        {
            try
            {
                var decodificada = WebEncoders.Base64UrlDecode(valor.TrimEnd('='));
                // La clave pública es un punto P-256 sin comprimir: empieza con 0x04.
                return decodificada.Length == bytes && (bytes != 65 || decodificada[0] == 0x04);
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }

    /// <summary>
    /// Clave pública para suscribirse a las notificaciones push.
    /// </summary>
    public class ClavePublicaResponse
    {
        /// <summary>Clave pública VAPID en base64url.</summary>
        public string ClavePublica { get; set; } = string.Empty;
    }

    /// <summary>
    /// Suscripción push del navegador (mismo formato que <c>PushSubscription.toJSON()</c>).
    /// </summary>
    public class SuscripcionRequest
    {
        /// <summary>Dirección del servicio de push del navegador.</summary>
        [Required, MaxLength(1000)]
        public string Endpoint { get; set; } = string.Empty;

        /// <summary>Claves de cifrado del navegador.</summary>
        [Required]
        public ClavesSuscripcion Keys { get; set; } = new();
    }

    /// <summary>
    /// Claves de cifrado de una suscripción push (base64url).
    /// </summary>
    public class ClavesSuscripcion
    {
        /// <summary>Clave pública del navegador (65 bytes).</summary>
        [Required, MaxLength(200)]
        public string P256dh { get; set; } = string.Empty;

        /// <summary>Secreto de autenticación (16 bytes).</summary>
        [Required, MaxLength(100)]
        public string Auth { get; set; } = string.Empty;
    }
}
