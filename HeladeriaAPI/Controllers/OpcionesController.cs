using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Consulta y administración de los sabores y toppings por categoría.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class OpcionesController : ControllerBase
    {
        private static readonly string[] TiposValidos = { Opcion.TipoSabor, Opcion.TipoTopping };

        private readonly IOpcionQueries _opcionQueries;
        private readonly ICategoriaQueries _categoriaQueries;
        private readonly IOpcionRepository _opcionRepository;

        public OpcionesController(
            IOpcionQueries opcionQueries,
            ICategoriaQueries categoriaQueries,
            IOpcionRepository opcionRepository)
        {
            _opcionQueries = opcionQueries;
            _categoriaQueries = categoriaQueries;
            _opcionRepository = opcionRepository;
        }

        /// <summary>
        /// Obtiene los sabores y toppings (activos e inactivos), con filtros opcionales.
        /// </summary>
        /// <param name="categoriaId">Si se indica, solo devuelve las opciones de esa categoría.</param>
        /// <param name="tipo">Si se indica ("Sabor" o "Topping"), solo devuelve ese tipo.</param>
        /// <response code="200">Devuelve la lista de opciones.</response>
        /// <response code="400">El tipo no es válido.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Opcion>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ObtenerTodos([FromQuery] int? categoriaId, [FromQuery] string? tipo)
        {
            string? tipoNormalizado = null;
            if (tipo is not null)
            {
                tipoNormalizado = NormalizarTipo(tipo);
                if (tipoNormalizado is null) return BadRequest(MensajeTipoInvalido);
            }

            var opciones = categoriaId is null
                ? await _opcionQueries.ObtenerTodosAsync()
                : await _opcionQueries.ObtenerPorCategoriaAsync(categoriaId.Value);

            return Ok(tipoNormalizado is null ? opciones : opciones.Where(o => o.Tipo == tipoNormalizado));
        }

        /// <summary>
        /// Obtiene un sabor o topping por su identificador.
        /// </summary>
        /// <param name="id">Identificador de la opción.</param>
        /// <response code="200">Devuelve la opción.</response>
        /// <response code="404">No existe una opción con ese id.</response>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(Opcion), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var opcion = await _opcionQueries.ObtenerPorIdAsync(id);
            if (opcion is null) return NotFound();
            return Ok(opcion);
        }

        /// <summary>
        /// Crea un sabor o topping para los productos de una categoría.
        /// </summary>
        /// <param name="solicitud">Categoría, tipo, nombre, orden y disponibilidad.</param>
        /// <response code="201">Opción creada.</response>
        /// <response code="400">Los datos no son válidos o la categoría no existe.</response>
        /// <response code="409">Ya existe una opción de ese tipo con ese nombre en la categoría.</response>
        [Authorize(Roles = Seguridad.SoloAdministrador)]
        [HttpPost]
        [ProducesResponseType(typeof(Opcion), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Crear([FromBody] OpcionRequest solicitud)
        {
            var (tipo, error) = await ValidarAsync(solicitud, idActual: null);
            if (error is not null) return error;

            var opcion = new Opcion
            {
                CategoriaId = solicitud.CategoriaId,
                Tipo = tipo!,
                Nombre = solicitud.Nombre.Trim(),
                Orden = solicitud.Orden,
                Activo = solicitud.Activo
            };
            opcion.OpcionId = await _opcionRepository.CrearAsync(opcion);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = opcion.OpcionId }, opcion);
        }

        /// <summary>
        /// Edita un sabor o topping. Para dejar de ofrecerlo se marca como inactivo (Activo = false).
        /// Los pedidos antiguos no cambian: guardan el nombre que se eligió.
        /// </summary>
        /// <param name="id">Identificador de la opción.</param>
        /// <param name="solicitud">Datos nuevos de la opción.</param>
        /// <response code="200">Devuelve la opción actualizada.</response>
        /// <response code="400">Los datos no son válidos o la categoría no existe.</response>
        /// <response code="404">No existe una opción con ese id.</response>
        /// <response code="409">Ya existe otra opción de ese tipo con ese nombre en la categoría.</response>
        [Authorize(Roles = Seguridad.SoloAdministrador)]
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(Opcion), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Actualizar(int id, [FromBody] OpcionRequest solicitud)
        {
            var opcion = await _opcionQueries.ObtenerPorIdAsync(id);
            if (opcion is null) return NotFound();

            var (tipo, error) = await ValidarAsync(solicitud, idActual: id);
            if (error is not null) return error;

            opcion.CategoriaId = solicitud.CategoriaId;
            opcion.Tipo = tipo!;
            opcion.Nombre = solicitud.Nombre.Trim();
            opcion.Orden = solicitud.Orden;
            opcion.Activo = solicitud.Activo;
            await _opcionRepository.ActualizarAsync(opcion);
            return Ok(opcion);
        }

        private static readonly string MensajeTipoInvalido =
            $"Tipo no válido. Valores permitidos: {string.Join(", ", TiposValidos)}.";

        private static string? NormalizarTipo(string tipo) =>
            TiposValidos.FirstOrDefault(t => string.Equals(t, tipo.Trim(), StringComparison.OrdinalIgnoreCase));

        private async Task<(string? Tipo, IActionResult? Error)> ValidarAsync(OpcionRequest solicitud, int? idActual)
        {
            var tipo = NormalizarTipo(solicitud.Tipo);
            if (tipo is null) return (null, BadRequest(MensajeTipoInvalido));

            if (await _categoriaQueries.ObtenerPorIdAsync(solicitud.CategoriaId) is null)
                return (null, BadRequest($"No existe la categoría {solicitud.CategoriaId}."));

            var nombre = solicitud.Nombre.Trim();
            var repetido = (await _opcionQueries.ObtenerPorCategoriaAsync(solicitud.CategoriaId)).Any(o =>
                o.OpcionId != idActual &&
                o.Tipo == tipo &&
                string.Equals(o.Nombre.Trim(), nombre, StringComparison.OrdinalIgnoreCase));

            if (repetido)
            {
                var etiqueta = tipo == Opcion.TipoSabor ? "un sabor" : "un topping";
                return (null, Conflict($"Ya existe {etiqueta} llamado \"{nombre}\" en esa categoría."));
            }

            return (tipo, null);
        }
    }

    /// <summary>
    /// Datos para crear o editar un sabor o topping.
    /// </summary>
    public class OpcionRequest
    {
        /// <summary>Categoría a cuyos productos aplica.</summary>
        [Range(1, int.MaxValue)]
        public int CategoriaId { get; set; }

        /// <summary>"Sabor" o "Topping".</summary>
        [Required]
        public string Tipo { get; set; } = string.Empty;

        /// <summary>
        /// Nombre de la opción (ej. "Chocolate"). Máximo 50 caracteres y sin comas,
        /// porque el pedido guarda los nombres elegidos separados por coma.
        /// </summary>
        [Required, MaxLength(50)]
        [RegularExpression(@"[^,]*[^,\s][^,]*", ErrorMessage = "El nombre no puede estar vacío ni llevar comas.")]
        public string Nombre { get; set; } = string.Empty;

        /// <summary>Posición en la que se muestra (de menor a mayor).</summary>
        [Range(0, 1000)]
        public int Orden { get; set; }

        /// <summary>Si la opción se puede elegir. Por defecto, sí.</summary>
        public bool Activo { get; set; } = true;
    }
}
