using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace HeladeriaAPI.Notificaciones
{
    /// <summary>
    /// Claves VAPID con las que la API firma las notificaciones push. El navegador del cliente
    /// recibe la pública al suscribirse y solo acepta avisos firmados con la privada que la acompaña.
    /// </summary>
    public sealed class ClavesPush
    {
        /// <summary>Archivo donde se guardan las claves generadas automáticamente (no se sube a git).</summary>
        public const string ArchivoGenerado = "claves-push.json";

        /// <summary>Clave pública (punto P-256 sin comprimir, base64url).</summary>
        public string Publica { get; init; } = string.Empty;

        /// <summary>Clave privada (base64url). Nunca sale de la API.</summary>
        public string Privada { get; init; } = string.Empty;

        /// <summary>Contacto para los servicios de push ("mailto:..." o una URL https).</summary>
        public string Asunto { get; init; } = string.Empty;

        /// <summary>
        /// Lee las claves de la configuración (sección "Notificaciones"). Si no están, usa las del
        /// archivo <see cref="ArchivoGenerado"/>, y si tampoco existe, genera un par nuevo y lo guarda ahí.
        /// Así funciona sin configurar nada en desarrollo y las suscripciones sobreviven a reinicios.
        /// </summary>
        public static ClavesPush Cargar(IConfiguration configuracion, IHostEnvironment entorno, ILogger logger)
        {
            var seccion = configuracion.GetSection("Notificaciones");
            var asunto = seccion["Asunto"];
            if (string.IsNullOrWhiteSpace(asunto)) asunto = "mailto:heladapp@example.com";

            var publica = seccion["ClavePublica"];
            var privada = seccion["ClavePrivada"];
            if (!string.IsNullOrWhiteSpace(publica) && !string.IsNullOrWhiteSpace(privada))
                return new ClavesPush { Publica = publica, Privada = privada, Asunto = asunto };

            var ruta = Path.Combine(entorno.ContentRootPath, ArchivoGenerado);
            if (File.Exists(ruta))
            {
                var guardadas = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(ruta));
                if (guardadas is not null &&
                    guardadas.TryGetValue("ClavePublica", out var p) && guardadas.TryGetValue("ClavePrivada", out var s))
                    return new ClavesPush { Publica = p, Privada = s, Asunto = asunto };
            }

            var nuevas = Generar(asunto);
            File.WriteAllText(ruta, JsonSerializer.Serialize(
                new Dictionary<string, string> { ["ClavePublica"] = nuevas.Publica, ["ClavePrivada"] = nuevas.Privada },
                new JsonSerializerOptions { WriteIndented = true }));
            logger.LogWarning(
                "No había claves para notificaciones push: se generaron y se guardaron en {Ruta}. " +
                "En producción configúralas en Notificaciones:ClavePublica y Notificaciones:ClavePrivada.", ruta);
            return nuevas;
        }

        /// <summary>Genera un par de claves VAPID nuevo (curva P-256).</summary>
        public static ClavesPush Generar(string asunto)
        {
            using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
            var parametros = ecdsa.ExportParameters(includePrivateParameters: true);
            var punto = new byte[65];
            punto[0] = 0x04; // formato sin comprimir: 0x04 || X || Y
            parametros.Q.X!.CopyTo(punto, 1);
            parametros.Q.Y!.CopyTo(punto, 33);
            return new ClavesPush
            {
                Publica = WebEncoders.Base64UrlEncode(punto),
                Privada = WebEncoders.Base64UrlEncode(parametros.D!),
                Asunto = asunto
            };
        }
    }
}
