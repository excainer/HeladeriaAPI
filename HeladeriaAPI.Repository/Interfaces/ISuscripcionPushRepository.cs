using HeladeriaAPI.Models;
using System.Threading.Tasks;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface ISuscripcionPushRepository
    {
        Task<bool> GuardarAsync(SuscripcionPush suscripcion, int maximoPorPedido);
        Task EliminarPorPedidoAsync(int pedidoId);
        Task EliminarAsync(int suscripcionPushId);
    }
}
