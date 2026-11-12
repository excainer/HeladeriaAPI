using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    public class MesaQueries : IMesaQueries
    {
        private readonly IDbConnection _conexion;

        public MesaQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        public async Task<IEnumerable<Mesa>> ObtenerTodasAsync()
        {
            const string sql = "SELECT MesaId, Numero, Estado FROM Mesas";
            return await _conexion.QueryAsync<Mesa>(sql);
        }

        public async Task<Mesa?> ObtenerPorIdAsync(int id)
        {
            const string sql = "SELECT MesaId, Numero, Estado FROM Mesas WHERE MesaId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Mesa>(sql, new { Id = id });
        }

        /// <summary>
        /// Busca una mesa por su número visible (el que trae el código QR).
        /// </summary>
        public async Task<Mesa?> ObtenerPorNumeroAsync(int numero)
        {
            const string sql = "SELECT TOP 1 MesaId, Numero, Estado FROM Mesas WHERE Numero = @Numero ORDER BY MesaId";
            return await _conexion.QueryFirstOrDefaultAsync<Mesa>(sql, new { Numero = numero });
        }
    }
}