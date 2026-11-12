using System.Threading.Tasks;
using HeladeriaAPI.Models;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface ITamanoRepository
    {
        Task<int> CrearAsync(Tamano entidad);
        Task<bool> ActualizarAsync(Tamano entidad);
    }
}
