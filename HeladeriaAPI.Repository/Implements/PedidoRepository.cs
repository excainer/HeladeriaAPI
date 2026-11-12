using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using Dapper.Contrib.Extensions;
using HeladeriaAPI.Models;
using HeladeriaAPI.Repository.Interfaces;

namespace HeladeriaAPI.Repository.Implements
{
    /// <summary>
    /// Operaciones de escritura sobre la cabecera de pedidos, usando Dapper y Dapper.Contrib.
    /// </summary>
    public class PedidoRepository : IPedidoRepository
    {
        private readonly IDbConnection _conexion;

        public PedidoRepository(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Crea un pedido y devuelve su identificador. Si no se indica fecha se usa la actual,
        /// y si no se indica estado se registra como "Pendiente".
        /// </summary>
        public async Task<int> CrearAsync(Pedido pedido)
        {
            if (pedido.Fecha == default)
                pedido.Fecha = DateTime.Now;

            if (string.IsNullOrWhiteSpace(pedido.Estado))
                pedido.Estado = "Pendiente";

            var id = await _conexion.InsertAsync(pedido);
            return (int)id;
        }

        /// <summary>
        /// Crea un pedido junto con todos sus detalles en una sola transacción: o se guarda todo
        /// o no se guarda nada. El Total se calcula como la suma de Cantidad x PrecioUnitario.
        /// </summary>
        public async Task<int> CrearConDetallesAsync(Pedido pedido, IEnumerable<DetallePedido> detalles)
        {
            var lista = detalles.ToList();

            if (pedido.Fecha == default)
                pedido.Fecha = DateTime.Now;

            if (string.IsNullOrWhiteSpace(pedido.Estado))
                pedido.Estado = "Pendiente";

            pedido.Total = lista.Sum(d => d.Cantidad * d.PrecioUnitario);

            if (_conexion.State != ConnectionState.Open)
                _conexion.Open();

            using var transaccion = _conexion.BeginTransaction();
            try
            {
                var pedidoId = (int)await _conexion.InsertAsync(pedido, transaccion);

                foreach (var detalle in lista)
                {
                    detalle.PedidoId = pedidoId;
                    await _conexion.InsertAsync(detalle, transaccion);
                }

                transaccion.Commit();
                return pedidoId;
            }
            catch
            {
                transaccion.Rollback();
                throw;
            }
        }

        /// <summary>
        /// Cambia el estado de un pedido. Devuelve false si el pedido no existe.
        /// </summary>
        public async Task<bool> ActualizarEstadoAsync(int pedidoId, string nuevoEstado)
        {
            const string sql = @"
                UPDATE Pedidos
                SET Estado = @Estado
                WHERE PedidoId = @PedidoId;";

            var filas = await _conexion.ExecuteAsync(sql, new { Estado = nuevoEstado, PedidoId = pedidoId });
            return filas > 0;
        }

        /// <summary>
        /// Elimina un pedido junto con sus detalles. Devuelve false si el pedido no existe.
        /// </summary>
        public async Task<bool> EliminarAsync(int pedidoId)
        {
            if (_conexion.State != ConnectionState.Open)
                _conexion.Open();

            using var transaccion = _conexion.BeginTransaction();
            try
            {
                await _conexion.ExecuteAsync(
                    "DELETE FROM DetallesPedido WHERE PedidoId = @PedidoId;",
                    new { PedidoId = pedidoId }, transaccion);

                var filas = await _conexion.ExecuteAsync(
                    "DELETE FROM Pedidos WHERE PedidoId = @PedidoId;",
                    new { PedidoId = pedidoId }, transaccion);

                transaccion.Commit();
                return filas > 0;
            }
            catch
            {
                transaccion.Rollback();
                throw;
            }
        }
    }
}