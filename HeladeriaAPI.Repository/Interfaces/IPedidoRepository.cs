
using HeladeriaAPI.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HeladeriaAPI.Repository.Interfaces
{
    public interface IPedidoRepository
    {
        Task<int> CrearAsync(Pedido pedido);
        Task<int> CrearConDetallesAsync(Pedido pedido, IEnumerable<DetallePedido> detalles);
        Task<bool> ActualizarEstadoAsync(int pedidoId, string nuevoEstado);
        Task<bool> EliminarAsync(int pedidoId);
    }
}
