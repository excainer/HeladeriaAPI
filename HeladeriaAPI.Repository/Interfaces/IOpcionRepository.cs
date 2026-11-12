using System.Threading.Tasks;
using HeladeriaAPI.Models;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface IOpcionRepository
    {
        Task<int> CrearAsync(Opcion entidad);
        Task<bool> ActualizarAsync(Opcion entidad);
    }
}
