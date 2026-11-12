using System.Data;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    /// <summary>
    /// Consultas (solo lectura) sobre las suscripciones a notificaciones push de los pedidos.
    /// </summary>
    public class SuscripcionPushQueries : ISuscripcionPushQueries
    {
        private readonly IDbConnection _conexion;

        public SuscripcionPushQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Celulares que esperan aviso de un pedido.
        /// </summary>
        public async Task<IEnumerable<SuscripcionPush>> ObtenerPorPedidoAsync(int pedidoId)
        {
            const string sql = @"
                SELECT SuscripcionPushId, PedidoId, Endpoint, P256dh, Auth, Fecha
                FROM SuscripcionesPush
                WHERE PedidoId = @PedidoId
                ORDER BY SuscripcionPushId";
            return await _conexion.QueryAsync<SuscripcionPush>(sql, new { PedidoId = pedidoId });
        }
    }
}
