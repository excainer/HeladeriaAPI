using System.Threading.Tasks;
using HeladeriaAPI.Models;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface IUsuarioRepository
    {
        Task<int> CrearAsync(Usuario entidad);
        Task<bool> ActualizarAsync(Usuario entidad);
    }
}
