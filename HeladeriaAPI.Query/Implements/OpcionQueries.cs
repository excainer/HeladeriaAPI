using System.Data;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    /// <summary>
    /// Consultas (solo lectura) sobre los sabores y toppings disponibles por categoría.
    /// </summary>
    public class OpcionQueries : IOpcionQueries
    {
        private const string Columnas = "OpcionId, CategoriaId, Tipo, Nombre, Orden, Activo";
        private const string OrdenListado = "ORDER BY CategoriaId, Tipo, Orden, OpcionId";

        private readonly IDbConnection _conexion;

        public OpcionQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Lista todas las opciones, agrupadas por categoría y tipo, en su orden de presentación.
        /// </summary>
        public async Task<IEnumerable<Opcion>> ObtenerTodosAsync()
        {
            const string sql = $"SELECT {Columnas} FROM Opciones {OrdenListado}";
            return await _conexion.QueryAsync<Opcion>(sql);
        }

        public async Task<Opcion?> ObtenerPorIdAsync(int id)
        {
            const string sql = $"SELECT {Columnas} FROM Opciones WHERE OpcionId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Opcion>(sql, new { Id = id });
        }

        public async Task<IEnumerable<Opcion>> ObtenerPorCategoriaAsync(int categoriaId)
        {
            const string sql = $"SELECT {Columnas} FROM Opciones WHERE CategoriaId = @CategoriaId {OrdenListado}";
            return await _conexion.QueryAsync<Opcion>(sql, new { CategoriaId = categoriaId });
        }

        /// <summary>
        /// Opciones de varias categorías a la vez (se usa al crear un pedido con productos de distintas categorías).
        /// </summary>
        public async Task<IEnumerable<Opcion>> ObtenerPorCategoriasAsync(IEnumerable<int> categoriaIds)
        {
            const string sql = $"SELECT {Columnas} FROM Opciones WHERE CategoriaId IN @Ids {OrdenListado}";
            return await _conexion.QueryAsync<Opcion>(sql, new { Ids = categoriaIds.Distinct().ToArray() });
        }
    }
}
