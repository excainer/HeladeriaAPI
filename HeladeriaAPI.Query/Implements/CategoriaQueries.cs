using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    public class CategoriaQueries : ICategoriaQueries
    {
        private readonly IDbConnection _conexion;

        public CategoriaQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        public async Task<IEnumerable<Categoria>> ObtenerTodasAsync()
        {
            const string sql = "SELECT CategoriaId, Nombre FROM Categorias";
            return await _conexion.QueryAsync<Categoria>(sql);
        }

        public async Task<Categoria?> ObtenerPorIdAsync(int id)
        {
            const string sql = "SELECT CategoriaId, Nombre FROM Categorias WHERE CategoriaId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Categoria>(sql, new { Id = id });
        }
    }
}