using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Consulta y administración de los tamaños por categoría (ej. Pequeño, Mediano, Grande).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class TamanosController : ControllerBase
    {
        private readonly ITamanoQueries _tamanoQueries;
        private readonly ICategoriaQueries _categoriaQueries;
        private readonly ITamanoRepository _tamanoRepository;

        public TamanosController(
            ITamanoQueries tamanoQueries,
            ICategoriaQueries categoriaQueries,
            ITamanoRepository tamanoRepository)
        {
            _tamanoQueries = tamanoQueries;
            _categoriaQueries = categoriaQueries;
            _tamanoRepository = tamanoRepository;
        }

        /// <summary>
        /// Obtiene los tamaños (activos e inactivos), con filtro opcional por categoría.
        /// </summary>
        /// <param name="categoriaId">Si se indica, solo devuelve los tamaños de esa categoría.</param>
        /// <response code="200">Devuelve la lista de tamaños.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Tamano>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTodos([FromQuery] int? categoriaId)
        {
            return Ok(categoriaId is null
                ? await _tamanoQueries.ObtenerTodosAsync()
                : await _tamanoQueries.ObtenerPorCategoriaAsync(categoriaId.Value));
        }

        /// <summary>
        /// Obtiene un tamaño por su identificador.
        /// </summary>
        /// <param name="id">Identificador del tamaño.</param>
        /// <response code="200">Devuelve el tamaño.</response>
        /// <response code="404">No existe un tamaño con ese id.</response>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(Tamano), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var tamano = await _tamanoQueries.ObtenerPorIdAsync(id);
            if (tamano is null) return NotFound();
            return Ok(tamano);
        }

        /// <summary>
        /// Crea un tamaño para los productos de una categoría.
        /// </summary>
        /// <param name="solicitud">Categoría, nombre, precio adicional, orden y disponibilidad.</param>
        /// <response code="201">Tamaño creado.</response>
        /// <response code="400">Los datos no son válidos o la categoría no existe.</response>
        /// <response code="409">Ya existe un tamaño con ese nombre en la categoría.</response>
        [HttpPost]
        [ProducesResponseType(typeof(Tamano), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Crear([FromBody] TamanoRequest solicitud)
        {
            var error = await ValidarAsync(solicitud, idActual: null);
            if (error is not null) return error;

            var tamano = new Tamano
            {
                CategoriaId = solicitud.CategoriaId,
                Nombre = solicitud.Nombre.Trim(),
                PrecioAdicional = solicitud.PrecioAdicional,
                Orden = solicitud.Orden,
                Activo = solicitud.Activo
            };
            tamano.TamanoId = await _tamanoRepository.CrearAsync(tamano);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = tamano.TamanoId }, tamano);
        }

        /// <summary>
        /// Edita un tamaño. Para dejar de ofrecerlo se marca como inactivo (Activo = false),
        /// así los pedidos antiguos que lo usan conservan su información.
        /// </summary>
        /// <param name="id">Identificador del tamaño.</param>
        /// <param name="solicitud">Datos nuevos del tamaño.</param>
        /// <response code="200">Devuelve el tamaño actualizado.</response>
        /// <response code="400">Los datos no son válidos o la categoría no existe.</response>
        /// <response code="404">No existe un tamaño con ese id.</response>
        /// <response code="409">Ya existe otro tamaño con ese nombre en la categoría.</response>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(Tamano), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Actualizar(int id, [FromBody] TamanoRequest solicitud)
        {
            var tamano = await _tamanoQueries.ObtenerPorIdAsync(id);
            if (tamano is null) return NotFound();

            var error = await ValidarAsync(solicitud, idActual: id);
            if (error is not null) return error;

            tamano.CategoriaId = solicitud.CategoriaId;
            tamano.Nombre = solicitud.Nombre.Trim();
            tamano.PrecioAdicional = solicitud.PrecioAdicional;
            tamano.Orden = solicitud.Orden;
            tamano.Activo = solicitud.Activo;
            await _tamanoRepository.ActualizarAsync(tamano);
            return Ok(tamano);
        }

        private async Task<IActionResult?> ValidarAsync(TamanoRequest solicitud, int? idActual)
        {
            if (await _categoriaQueries.ObtenerPorIdAsync(solicitud.CategoriaId) is null)
                return BadRequest($"No existe la categoría {solicitud.CategoriaId}.");

            var nombre = solicitud.Nombre.Trim();
            var repetido = (await _tamanoQueries.ObtenerPorCategoriaAsync(solicitud.CategoriaId)).Any(t =>
                t.TamanoId != idActual &&
                string.Equals(t.Nombre.Trim(), nombre, StringComparison.OrdinalIgnoreCase));

            return repetido
                ? Conflict($"Ya existe un tamaño llamado \"{nombre}\" en esa categoría.")
                : null;
        }
    }

    /// <summary>
    /// Datos para crear o editar un tamaño.
    /// </summary>
    public class TamanoRequest
    {
        /// <summary>Categoría a cuyos productos aplica.</summary>
        [Range(1, int.MaxValue)]
        public int CategoriaId { get; set; }

        /// <summary>Nombre del tamaño (ej. "Grande"). Máximo 50 caracteres.</summary>
        [Required, MaxLength(50), RegularExpression(@".*\S.*", ErrorMessage = "El nombre no puede estar vacío.")]
        public string Nombre { get; set; } = string.Empty;

        /// <summary>Valor que se suma al precio base del producto (0 o más).</summary>
        [Range(typeof(decimal), "0", "99999999",
            ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
        public decimal PrecioAdicional { get; set; }

        /// <summary>Posición en la que se muestra (de menor a mayor).</summary>
        [Range(0, 1000)]
        public int Orden { get; set; }

        /// <summary>Si el tamaño se puede elegir. Por defecto, sí.</summary>
        public bool Activo { get; set; } = true;
    }
}
