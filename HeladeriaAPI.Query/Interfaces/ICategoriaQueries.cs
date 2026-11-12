


using HeladeriaAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface ICategoriaQueries
    {
        Task<IEnumerable<Categoria>> ObtenerTodasAsync();
        Task<Categoria?> ObtenerPorIdAsync(int id);
    }
}


