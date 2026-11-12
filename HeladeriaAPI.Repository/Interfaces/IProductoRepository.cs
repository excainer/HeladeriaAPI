using System.Threading.Tasks;
using HeladeriaAPI.Models;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface IProductoRepository
    {
        Task<int> CrearAsync(Producto entidad);
        Task<bool> ActualizarAsync(Producto entidad);
    }
}
