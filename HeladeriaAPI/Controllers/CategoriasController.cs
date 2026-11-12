using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Consulta de las categorías de productos de la heladería.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class CategoriasController : ControllerBase
    {
        private readonly ICategoriaQueries _categoriaQueries;
        private readonly ICategoriaRepository _categoriaRepository;

        public CategoriasController(ICategoriaQueries categoriaQueries, ICategoriaRepository categoriaRepository)
        {
            _categoriaQueries = categoriaQueries;
            _categoriaRepository = categoriaRepository;
        }

        /// <summary>
        /// Obtiene la lista de todas las categorías.
        /// </summary>
        /// <response code="200">Devuelve la lista de categorías.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Categoria>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTodas()
        {
            return Ok(await _categoriaQueries.ObtenerTodasAsync());
        }

        /// <summary>
        /// Obtiene una categoría por su identificador.
        /// </summary>
        /// <param name="id">Identificador de la categoría.</param>
        /// <response code="200">Devuelve la categoría.</response>
        /// <response code="404">No existe una categoría con ese id.</response>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(Categoria), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var categoria = await _categoriaQueries.ObtenerPorIdAsync(id);
            if (categoria is null) return NotFound();
            return Ok(categoria);
        }

        /// <summary>
        /// Crea una categoría nueva.
        /// </summary>
        /// <param name="solicitud">Nombre de la categoría.</param>
        /// <response code="201">Categoría creada.</response>
        /// <response code="400">Los datos no son válidos.</response>
        /// <response code="409">Ya existe una categoría con ese nombre.</response>
        [Authorize(Roles = Seguridad.SoloAdministrador)]
        [HttpPost]
        [ProducesResponseType(typeof(Categoria), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Crear([FromBody] CategoriaRequest solicitud)
        {
            var nombre = solicitud.Nombre.Trim();
            if (await NombreEnUsoAsync(nombre, idActual: null))
                return Conflict($"Ya existe una categoría llamada \"{nombre}\".");

            var categoria = new Categoria { Nombre = nombre };
            categoria.CategoriaId = await _categoriaRepository.CrearAsync(categoria);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = categoria.CategoriaId }, categoria);
        }

        /// <summary>
        /// Cambia el nombre de una categoría.
        /// </summary>
        /// <param name="id">Identificador de la categoría.</param>
        /// <param name="solicitud">Nuevo nombre.</param>
        /// <response code="200">Devuelve la categoría actualizada.</response>
        /// <response code="400">Los datos no son válidos.</response>
        /// <response code="404">No existe una categoría con ese id.</response>
        /// <response code="409">Ya existe otra categoría con ese nombre.</response>
        [Authorize(Roles = Seguridad.SoloAdministrador)]
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(Categoria), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Actualizar(int id, [FromBody] CategoriaRequest solicitud)
        {
            var categoria = await _categoriaQueries.ObtenerPorIdAsync(id);
            if (categoria is null) return NotFound();

            var nombre = solicitud.Nombre.Trim();
            if (await NombreEnUsoAsync(nombre, idActual: id))
                return Conflict($"Ya existe una categoría llamada \"{nombre}\".");

            categoria.Nombre = nombre;
            await _categoriaRepository.ActualizarAsync(categoria);
            return Ok(categoria);
        }

        private async Task<bool> NombreEnUsoAsync(string nombre, int? idActual) =>
            (await _categoriaQueries.ObtenerTodasAsync()).Any(c =>
                c.CategoriaId != idActual &&
                string.Equals(c.Nombre.Trim(), nombre, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Datos para crear o editar una categoría.
    /// </summary>
    public class CategoriaRequest
    {
        /// <summary>Nombre de la categoría (ej. "Postres"). Máximo 100 caracteres.</summary>
        [Required, MaxLength(100), RegularExpression(@".*\S.*", ErrorMessage = "El nombre no puede estar vacío.")]
        public string Nombre { get; set; } = string.Empty;
    }
}