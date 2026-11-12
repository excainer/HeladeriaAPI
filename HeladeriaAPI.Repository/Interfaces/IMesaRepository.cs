using System.Threading.Tasks;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface IMesaRepository
    {
        Task<bool> LiberarAsync(int mesaId);
    }
}
