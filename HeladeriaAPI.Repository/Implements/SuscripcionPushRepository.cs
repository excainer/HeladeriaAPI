using System.Data;
using System.Threading.Tasks;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Repository.Interfaces;

namespace HeladeriaAPI.Repository.Implements
{
    /// <summary>
    /// Operaciones de escritura sobre las suscripciones a notificaciones push.
    /// </summary>
    public class SuscripcionPushRepository : ISuscripcionPushRepository
    {
        private readonly IDbConnection _conexion;

        public SuscripcionPushRepository(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Guarda la suscripción del celular para el pedido. Si ese celular ya estaba suscrito,
        /// actualiza sus claves (no se duplica). Devuelve false si el pedido ya tiene el máximo de celulares.
        /// </summary>
        public async Task<bool> GuardarAsync(SuscripcionPush suscripcion, int maximoPorPedido)
        {
            // Todo en una sola sentencia para que dos peticiones simultáneas no superen el máximo.
            const string sql = @"
                SET XACT_ABORT ON;
                BEGIN TRANSACTION;
                UPDATE SuscripcionesPush WITH (UPDLOCK, HOLDLOCK)
                SET P256dh = @P256dh, Auth = @Auth
                WHERE PedidoId = @PedidoId AND Endpoint = @Endpoint;

                IF @@ROWCOUNT = 0
                BEGIN
                    IF (SELECT COUNT(*) FROM SuscripcionesPush WITH (UPDLOCK, HOLDLOCK) WHERE PedidoId = @PedidoId) >= @Maximo
                    BEGIN
                        COMMIT;
                        SELECT CAST(0 AS BIT);
                        RETURN;
                    END
                    INSERT INTO SuscripcionesPush (PedidoId, Endpoint, P256dh, Auth)
                    VALUES (@PedidoId, @Endpoint, @P256dh, @Auth);
                END
                COMMIT;
                SELECT CAST(1 AS BIT);";

            return await _conexion.ExecuteScalarAsync<bool>(sql, new
            {
                suscripcion.PedidoId,
                suscripcion.Endpoint,
                suscripcion.P256dh,
                suscripcion.Auth,
                Maximo = maximoPorPedido
            });
        }

        /// <summary>
        /// Borra todas las suscripciones de un pedido (ya se avisó o ya no hay nada que avisar).
        /// </summary>
        public Task EliminarPorPedidoAsync(int pedidoId)
        {
            return _conexion.ExecuteAsync(
                "DELETE FROM SuscripcionesPush WHERE PedidoId = @PedidoId;", new { PedidoId = pedidoId });
        }

        /// <summary>
        /// Borra una suscripción (por ejemplo, el navegador avisó que ya no existe).
        /// </summary>
        public Task EliminarAsync(int suscripcionPushId)
        {
            return _conexion.ExecuteAsync(
                "DELETE FROM SuscripcionesPush WHERE SuscripcionPushId = @Id;", new { Id = suscripcionPushId });
        }
    }
}
