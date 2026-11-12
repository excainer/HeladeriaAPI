using HeladeriaAPI.Models;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface IOpcionQueries
    {
        Task<IEnumerable<Opcion>> ObtenerTodosAsync();
        Task<Opcion?> ObtenerPorIdAsync(int id);
        Task<IEnumerable<Opcion>> ObtenerPorCategoriaAsync(int categoriaId);
        Task<IEnumerable<Opcion>> ObtenerPorCategoriasAsync(IEnumerable<int> categoriaIds);
    }
}
