using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Consulta de las mesas de la heladería y liberación por parte del personal.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class MesasController : ControllerBase
    {
        private readonly IMesaQueries _mesaQueries;
        private readonly IMesaRepository _mesaRepository;

        public MesasController(IMesaQueries mesaQueries, IMesaRepository mesaRepository)
        {
            _mesaQueries = mesaQueries;
            _mesaRepository = mesaRepository;
        }

        /// <summary>
        /// Libera una mesa (por ejemplo, cuando el cliente paga y se va): vuelve a quedar Disponible
        /// hasta el siguiente pedido. No se puede liberar si tiene pedidos sin entregar.
        /// </summary>
        /// <param name="id">Identificador de la mesa.</param>
        /// <response code="200">Mesa liberada; devuelve su estado actualizado.</response>
        /// <response code="401">No hay sesión del personal.</response>
        /// <response code="404">No existe una mesa con ese id.</response>
        /// <response code="409">La mesa tiene pedidos sin entregar.</response>
        [HttpPost("{id:int}/liberar")]
        [Authorize]
        [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Liberar(int id)
        {
            var mesa = await _mesaQueries.ObtenerPorIdAsync(id);
            if (mesa is null) return NotFound();

            if (mesa.PedidosActivos > 0)
            {
                var pedidos = mesa.PedidosActivos == 1 ? "1 pedido sin entregar" : $"{mesa.PedidosActivos} pedidos sin entregar";
                return Conflict($"La mesa {mesa.Numero} tiene {pedidos}. Entrégalos antes de liberarla.");
            }

            await _mesaRepository.LiberarAsync(id);
            return Ok(await _mesaQueries.ObtenerPorIdAsync(id));
        }

        /// <summary>
        /// Obtiene la lista de todas las mesas.
        /// </summary>
        /// <response code="200">Devuelve la lista de mesas.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Mesa>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTodas()
        {
            return Ok(await _mesaQueries.ObtenerTodasAsync());
        }

        /// <summary>
        /// Obtiene una mesa por su identificador.
        /// </summary>
        /// <param name="id">Identificador de la mesa.</param>
        /// <response code="200">Devuelve la mesa.</response>
        /// <response code="404">No existe una mesa con ese id.</response>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var mesa = await _mesaQueries.ObtenerPorIdAsync(id);
            if (mesa is null) return NotFound();
            return Ok(mesa);
        }

        /// <summary>
        /// Obtiene una mesa por su número visible (el que trae el código QR de la mesa).
        /// </summary>
        /// <param name="numero">Número de la mesa.</param>
        /// <response code="200">Devuelve la mesa.</response>
        /// <response code="404">No existe una mesa con ese número.</response>
        [HttpGet("numero/{numero:int}")]
        [ProducesResponseType(typeof(Mesa), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorNumero(int numero)
        {
            var mesa = await _mesaQueries.ObtenerPorNumeroAsync(numero);
            if (mesa is null) return NotFound($"No existe la mesa número {numero}.");
            return Ok(mesa);
        }
    }
}