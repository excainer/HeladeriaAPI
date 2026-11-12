using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Consulta de las mesas de la heladería.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class MesasController : ControllerBase
    {
        private readonly IMesaQueries _mesaQueries;

        public MesasController(IMesaQueries mesaQueries)
        {
            _mesaQueries = mesaQueries;
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