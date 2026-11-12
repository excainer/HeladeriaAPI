using HeladeriaAPI.Models;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface IUsuarioQueries
    {
        Task<IEnumerable<Usuario>> ObtenerTodosAsync();
        Task<Usuario?> ObtenerPorIdAsync(int id);
        Task<Usuario?> ObtenerPorNombreUsuarioAsync(string nombreUsuario);
    }
}
