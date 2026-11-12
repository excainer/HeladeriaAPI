using System.Threading.Tasks;
using HeladeriaAPI.Models;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface ICategoriaRepository
    {
        Task<int> CrearAsync(Categoria entidad);
        Task<bool> ActualizarAsync(Categoria entidad);
    }
}
