using System.Net;
using System.Text.Json;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Lib.Net.Http.WebPush;
using Lib.Net.Http.WebPush.Authentication;

namespace HeladeriaAPI.Notificaciones
{
    /// <summary>
    /// Envía notificaciones push a los celulares que siguen un pedido.
    /// </summary>
    public interface INotificadorPush
    {
        /// <summary>
        /// Avisa a todos los celulares suscritos al pedido y luego borra sus suscripciones
        /// (cada pedido avisa una sola vez). Nunca lanza error: si un aviso falla, el pedido sigue igual.
        /// </summary>
        Task AvisarYCerrarAsync(int pedidoId, string titulo, string mensaje);

        /// <summary>Borra las suscripciones del pedido sin avisar (ya no hay nada que esperar).</summary>
        Task CerrarAsync(int pedidoId);
    }

    /// <inheritdoc />
    public class NotificadorPush : INotificadorPush
    {
        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        private readonly PushServiceClient _cliente;
        private readonly ISuscripcionPushQueries _consultas;
        private readonly ISuscripcionPushRepository _repositorio;
        private readonly ILogger<NotificadorPush> _logger;

        public NotificadorPush(
            HttpClient http,
            ClavesPush claves,
            ISuscripcionPushQueries consultas,
            ISuscripcionPushRepository repositorio,
            ILogger<NotificadorPush> logger)
        {
            _cliente = new PushServiceClient(http)
            {
                DefaultAuthentication = new VapidAuthentication(claves.Publica, claves.Privada)
                {
                    Subject = claves.Asunto
                },
                // Si el celular está apagado, el servicio de push guarda el aviso hasta 1 hora.
                DefaultTimeToLive = 3600
            };
            _consultas = consultas;
            _repositorio = repositorio;
            _logger = logger;
        }

        public async Task AvisarYCerrarAsync(int pedidoId, string titulo, string mensaje)
        {
            try
            {
                var suscripciones = (await _consultas.ObtenerPorPedidoAsync(pedidoId)).ToList();
                if (suscripciones.Count == 0) return;

                var contenido = JsonSerializer.Serialize(new
                {
                    titulo,
                    mensaje,
                    url = $"/pedido/{pedidoId}",
                    // Con la misma etiqueta, un aviso nuevo del pedido reemplaza al anterior en vez de apilarse.
                    etiqueta = $"pedido-{pedidoId}"
                }, Json);

                await Task.WhenAll(suscripciones.Select(s => EnviarAsync(s, contenido)));
                await _repositorio.EliminarPorPedidoAsync(pedidoId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudieron enviar los avisos push del pedido {PedidoId}.", pedidoId);
            }
        }

        public async Task CerrarAsync(int pedidoId)
        {
            try
            {
                await _repositorio.EliminarPorPedidoAsync(pedidoId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "No se pudieron borrar las suscripciones push del pedido {PedidoId}.", pedidoId);
            }
        }

        private async Task EnviarAsync(SuscripcionPush suscripcion, string contenido)
        {
            var destino = new PushSubscription { Endpoint = suscripcion.Endpoint };
            destino.SetKey(PushEncryptionKeyName.P256DH, suscripcion.P256dh);
            destino.SetKey(PushEncryptionKeyName.Auth, suscripcion.Auth);

            try
            {
                await _cliente.RequestPushMessageDeliveryAsync(destino, new PushMessage(contenido)
                {
                    Urgency = PushMessageUrgency.High
                });
            }
            catch (PushServiceClientException ex) when (ex.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
            {
                // El celular quitó el permiso o la suscripción venció: no hay a quién avisar.
                _logger.LogInformation("La suscripción push {Id} ya no existe.", suscripcion.SuscripcionPushId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falló el aviso push {Id} del pedido {PedidoId}.",
                    suscripcion.SuscripcionPushId, suscripcion.PedidoId);
            }
        }
    }
}
