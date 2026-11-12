using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    public class ProductoQueries : IProductoQueries
    {
        private readonly IDbConnection _conexion;

        public ProductoQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        public async Task<IEnumerable<Producto>> ObtenerTodosAsync()
        {
            const string sql = "SELECT ProductoId, CategoriaId, Nombre, Precio, Activo FROM Productos";
            return await _conexion.QueryAsync<Producto>(sql);
        }

        public async Task<Producto?> ObtenerPorIdAsync(int id)
        {
            const string sql = "SELECT ProductoId, CategoriaId, Nombre, Precio, Activo FROM Productos WHERE ProductoId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Producto>(sql, new { Id = id });
        }

        public async Task<IEnumerable<Producto>> ObtenerPorCategoriaAsync(int categoriaId)
        {
            const string sql = "SELECT ProductoId, CategoriaId, Nombre, Precio, Activo FROM Productos WHERE CategoriaId = @CategoriaId";
            return await _conexion.QueryAsync<Producto>(sql, new { CategoriaId = categoriaId });
        }

        /// <summary>
        /// Consulta varios productos a la vez (los ids que no existan simplemente no aparecen).
        /// </summary>
        public async Task<IEnumerable<Producto>> ObtenerPorIdsAsync(IEnumerable<int> ids)
        {
            const string sql = "SELECT ProductoId, CategoriaId, Nombre, Precio, Activo FROM Productos WHERE ProductoId IN @Ids";
            return await _conexion.QueryAsync<Producto>(sql, new { Ids = ids.Distinct().ToArray() });
        }
    }
}