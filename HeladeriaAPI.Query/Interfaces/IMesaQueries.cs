
using HeladeriaAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface IMesaQueries
    {
        Task<IEnumerable<Mesa>> ObtenerTodasAsync();
        Task<Mesa?> ObtenerPorIdAsync(int id);
        Task<Mesa?> ObtenerPorNumeroAsync(int numero);
    }
}
