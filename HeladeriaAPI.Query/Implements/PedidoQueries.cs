using System.Data;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    /// <summary>
    /// Consultas (solo lectura) sobre pedidos y sus detalles, usando Dapper.
    /// </summary>
    public class PedidoQueries : IPedidoQueries
    {
        private readonly IDbConnection _conexion;

        public PedidoQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Lista todos los pedidos, del más reciente al más antiguo.
        /// </summary>
        public async Task<IEnumerable<Pedido>> ObtenerTodosAsync()
        {
            const string sql = @"
                SELECT p.PedidoId, p.MesaId, p.Fecha, p.Estado, p.Total, p.ParaLlevar, p.RegistradoPorId, u.Nombre AS RegistradoPor
                FROM Pedidos p
                LEFT JOIN Usuarios u ON u.UsuarioId = p.RegistradoPorId
                ORDER BY p.Fecha DESC;";

            return await _conexion.QueryAsync<Pedido>(sql);
        }

        /// <summary>
        /// Consulta un pedido por su identificador. Devuelve null si no existe.
        /// </summary>
        public async Task<Pedido?> ObtenerPorIdAsync(int id)
        {
            const string sql = @"
                SELECT p.PedidoId, p.MesaId, p.Fecha, p.Estado, p.Total, p.ParaLlevar, p.RegistradoPorId, u.Nombre AS RegistradoPor
                FROM Pedidos p
                LEFT JOIN Usuarios u ON u.UsuarioId = p.RegistradoPorId
                WHERE p.PedidoId = @Id;";

            return await _conexion.QueryFirstOrDefaultAsync<Pedido>(sql, new { Id = id });
        }

        /// <summary>
        /// Filtra los pedidos por estado (ej. Pendiente, En Preparacion, Listo, Entregado).
        /// Se ordena del más antiguo al más reciente, que es el orden de atención en cocina.
        /// </summary>
        public async Task<IEnumerable<Pedido>> ObtenerPorEstadoAsync(string estado)
        {
            const string sql = @"
                SELECT p.PedidoId, p.MesaId, p.Fecha, p.Estado, p.Total, p.ParaLlevar, p.RegistradoPorId, u.Nombre AS RegistradoPor
                FROM Pedidos p
                LEFT JOIN Usuarios u ON u.UsuarioId = p.RegistradoPorId
                WHERE p.Estado = @Estado
                ORDER BY p.Fecha ASC;";

            return await _conexion.QueryAsync<Pedido>(sql, new { Estado = estado });
        }

        /// <summary>
        /// Lista los pedidos de una mesa, del más reciente al más antiguo.
        /// </summary>
        public async Task<IEnumerable<Pedido>> ObtenerPorMesaAsync(int mesaId)
        {
            const string sql = @"
                SELECT p.PedidoId, p.MesaId, p.Fecha, p.Estado, p.Total, p.ParaLlevar, p.RegistradoPorId, u.Nombre AS RegistradoPor
                FROM Pedidos p
                LEFT JOIN Usuarios u ON u.UsuarioId = p.RegistradoPorId
                WHERE p.MesaId = @MesaId
                ORDER BY p.Fecha DESC;";

            return await _conexion.QueryAsync<Pedido>(sql, new { MesaId = mesaId });
        }

        /// <summary>
        /// Lista los ítems (detalles) que componen un pedido.
        /// </summary>
        public async Task<IEnumerable<DetallePedido>> ObtenerDetallesPorPedidoAsync(int pedidoId)
        {
            const string sql = @"
                SELECT DetallePedidoId, PedidoId, ProductoId, TamanoId, Cantidad,
                       Sabores, Toppings, Observaciones, PrecioUnitario
                FROM DetallesPedido
                WHERE PedidoId = @PedidoId
                ORDER BY DetallePedidoId;";

            return await _conexion.QueryAsync<DetallePedido>(sql, new { PedidoId = pedidoId });
        }
    }
}
