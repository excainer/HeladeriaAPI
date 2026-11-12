using HeladeriaAPI.Models;

namespace HeladeriaAPI.Query.Interfaces
{
    public interface ISuscripcionPushQueries
    {
        Task<IEnumerable<SuscripcionPush>> ObtenerPorPedidoAsync(int pedidoId);
    }
}
