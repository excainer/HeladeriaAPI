using HeladeriaAPI.Models;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface ITamanoQueries
    {
        Task<IEnumerable<Tamano>> ObtenerTodosAsync();
        Task<Tamano?> ObtenerPorIdAsync(int id);
        Task<IEnumerable<Tamano>> ObtenerPorCategoriaAsync(int categoriaId);
        Task<IEnumerable<Tamano>> ObtenerPorCategoriasAsync(IEnumerable<int> categoriaIds);
    }
}
