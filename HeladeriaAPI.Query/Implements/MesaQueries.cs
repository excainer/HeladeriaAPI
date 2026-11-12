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
    /// una mesa está "Ocupada" desde su primer pedido posterior a la última liberación
    /// (o mientras tenga pedidos sin entregar) hasta que el personal la libera.
    /// </summary>
    public class MesaQueries : IMesaQueries
    {
        private const string Consulta = @"
            SELECT m.MesaId, m.Numero, m.LiberadaEn,
                   CASE WHEN a.Activos > 0 OR d.DesdeLiberacion > 0 THEN N'Ocupada' ELSE m.Estado END AS Estado,
                   a.Activos AS PedidosActivos,
                   d.DesdeLiberacion AS PedidosDesdeLiberacion
            FROM Mesas m
            OUTER APPLY (SELECT COUNT(*) AS Activos
                         FROM Pedidos p
                         WHERE p.MesaId = m.MesaId AND p.Estado <> N'Entregado') a
            OUTER APPLY (SELECT COUNT(*) AS DesdeLiberacion
                         FROM Pedidos p
                         WHERE p.MesaId = m.MesaId AND (m.LiberadaEn IS NULL OR p.Fecha > m.LiberadaEn)) d";

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
