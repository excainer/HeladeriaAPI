using HeladeriaAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface IProductoQueries
    {
        Task<IEnumerable<Producto>> ObtenerTodosAsync();
        Task<Producto?> ObtenerPorIdAsync(int id);
        Task<IEnumerable<Producto>> ObtenerPorCategoriaAsync(int categoriaId);
        Task<IEnumerable<Producto>> ObtenerPorIdsAsync(IEnumerable<int> ids);
    }
}