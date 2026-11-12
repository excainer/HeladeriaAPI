using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    /// <summary>
    /// Consultas sobre las mesas. El estado se calcula a partir de los pedidos:
    /// una mesa con algún pedido sin entregar está "Ocupada"; si no, vale lo guardado (normalmente "Disponible").
    /// Así el estado nunca queda desactualizado.
    /// </summary>
    public class MesaQueries : IMesaQueries
    {
        private const string Consulta = @"
            SELECT m.MesaId, m.Numero,
                   CASE WHEN a.Activos > 0 THEN N'Ocupada' ELSE m.Estado END AS Estado,
                   a.Activos AS PedidosActivos
            FROM Mesas m
            OUTER APPLY (SELECT COUNT(*) AS Activos
                         FROM Pedidos p
                         WHERE p.MesaId = m.MesaId AND p.Estado <> N'Entregado') a";

        private readonly IDbConnection _conexion;

        public MesaQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        public async Task<IEnumerable<Mesa>> ObtenerTodasAsync()
        {
            const string sql = Consulta + " ORDER BY m.Numero";
            return await _conexion.QueryAsync<Mesa>(sql);
        }

        public async Task<Mesa?> ObtenerPorIdAsync(int id)
        {
            const string sql = Consulta + " WHERE m.MesaId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Mesa>(sql, new { Id = id });
        }

        /// <summary>
        /// Busca una mesa por su número visible (el que trae el código QR).
        /// </summary>
        public async Task<Mesa?> ObtenerPorNumeroAsync(int numero)
        {
            const string sql = Consulta + " WHERE m.Numero = @Numero ORDER BY m.MesaId OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY";
            return await _conexion.QueryFirstOrDefaultAsync<Mesa>(sql, new { Numero = numero });
        }
    }
}
