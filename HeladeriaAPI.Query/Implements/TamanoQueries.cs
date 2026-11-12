using System.Data;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    /// <summary>
    /// Consultas (solo lectura) sobre los tamaños disponibles por categoría.
    /// </summary>
    public class TamanoQueries : ITamanoQueries
    {
        private const string Columnas = "TamanoId, CategoriaId, Nombre, PrecioAdicional, Orden, Activo";

        private readonly IDbConnection _conexion;

        public TamanoQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Lista todos los tamaños, agrupados por categoría y en su orden de presentación.
        /// </summary>
        public async Task<IEnumerable<Tamano>> ObtenerTodosAsync()
        {
            const string sql = $"SELECT {Columnas} FROM Tamanos ORDER BY CategoriaId, Orden, TamanoId";
            return await _conexion.QueryAsync<Tamano>(sql);
        }

        public async Task<Tamano?> ObtenerPorIdAsync(int id)
        {
            const string sql = $"SELECT {Columnas} FROM Tamanos WHERE TamanoId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Tamano>(sql, new { Id = id });
        }

        public async Task<IEnumerable<Tamano>> ObtenerPorCategoriaAsync(int categoriaId)
        {
            const string sql = $"SELECT {Columnas} FROM Tamanos WHERE CategoriaId = @CategoriaId ORDER BY Orden, TamanoId";
            return await _conexion.QueryAsync<Tamano>(sql, new { CategoriaId = categoriaId });
        }

        /// <summary>
        /// Tamaños de varias categorías a la vez (se usa al crear un pedido con productos de distintas categorías).
        /// </summary>
        public async Task<IEnumerable<Tamano>> ObtenerPorCategoriasAsync(IEnumerable<int> categoriaIds)
        {
            const string sql = $"SELECT {Columnas} FROM Tamanos WHERE CategoriaId IN @Ids ORDER BY CategoriaId, Orden, TamanoId";
            return await _conexion.QueryAsync<Tamano>(sql, new { Ids = categoriaIds.Distinct().ToArray() });
        }
    }
}
