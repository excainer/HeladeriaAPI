using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Consulta y administración de los productos (helados y complementos) de la heladería.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class ProductosController : ControllerBase
    {
        private readonly IProductoQueries _productoQueries;
        private readonly ICategoriaQueries _categoriaQueries;
        private readonly ITamanoQueries _tamanoQueries;
        private readonly IProductoRepository _productoRepository;

        public ProductosController(
            IProductoQueries productoQueries,
            ICategoriaQueries categoriaQueries,
            ITamanoQueries tamanoQueries,
            IProductoRepository productoRepository)
        {
            _productoQueries = productoQueries;
            _categoriaQueries = categoriaQueries;
            _tamanoQueries = tamanoQueries;
            _productoRepository = productoRepository;
        }

        /// <summary>
        /// Obtiene la lista de productos, con filtro opcional por categoría.
        /// </summary>
        /// <param name="categoriaId">Si se indica, solo devuelve los productos de esa categoría.</param>
        /// <response code="200">Devuelve la lista de productos.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Producto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTodos([FromQuery] int? categoriaId)
        {
            return Ok(categoriaId is null
                ? await _productoQueries.ObtenerTodosAsync()
                : await _productoQueries.ObtenerPorCategoriaAsync(categoriaId.Value));
        }

        /// <summary>
        /// Obtiene el detalle de un producto, incluidos los tamaños que se pueden elegir.
        /// </summary>
        /// <param name="id">Identificador del producto.</param>
        /// <response code="200">Devuelve el producto con sus tamaños activos.</response>
        /// <response code="404">No existe un producto con ese id.</response>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(ProductoDetalle), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var producto = await _productoQueries.ObtenerPorIdAsync(id);
            if (producto is null) return NotFound();

            var tamanos = (await _tamanoQueries.ObtenerPorCategoriaAsync(producto.CategoriaId))
                .Where(t => t.Activo)
                .ToList();

            return Ok(new ProductoDetalle
            {
                ProductoId = producto.ProductoId,
                CategoriaId = producto.CategoriaId,
                Nombre = producto.Nombre,
                Precio = producto.Precio,
                Activo = producto.Activo,
                Tamanos = tamanos
            });
        }

        /// <summary>
        /// Obtiene los productos de una categoría (equivale a <c>GET /api/Productos?categoriaId=</c>).
        /// </summary>
        /// <param name="categoriaId">Identificador de la categoría.</param>
        /// <response code="200">Devuelve los productos de la categoría.</response>
        [HttpGet("categoria/{categoriaId:int}")]
        [ProducesResponseType(typeof(IEnumerable<Producto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerPorCategoria(int categoriaId)
        {
            return Ok(await _productoQueries.ObtenerPorCategoriaAsync(categoriaId));
        }

        /// <summary>
        /// Crea un producto en el catálogo.
        /// </summary>
        /// <param name="solicitud">Categoría, nombre, precio base y disponibilidad.</param>
        /// <response code="201">Producto creado.</response>
        /// <response code="400">Los datos no son válidos o la categoría no existe.</response>
        /// <response code="409">Ya existe un producto con ese nombre en la categoría.</response>
        [Authorize(Roles = Seguridad.SoloAdministrador)]
        [HttpPost]
        [ProducesResponseType(typeof(Producto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Crear([FromBody] ProductoRequest solicitud)
        {
            var error = await ValidarAsync(solicitud, idActual: null);
            if (error is not null) return error;

            var producto = new Producto
            {
                CategoriaId = solicitud.CategoriaId,
                Nombre = solicitud.Nombre.Trim(),
                Precio = solicitud.Precio,
                Activo = solicitud.Activo
            };
            producto.ProductoId = await _productoRepository.CrearAsync(producto);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = producto.ProductoId }, producto);
        }

        /// <summary>
        /// Edita un producto: categoría, nombre, precio base o disponibilidad.
        /// Para "eliminar" un producto se marca como no disponible (Activo = false),
        /// así no se pierde el histórico de pedidos que lo incluyen.
        /// </summary>
        /// <param name="id">Identificador del producto.</param>
        /// <param name="solicitud">Datos nuevos del producto.</param>
        /// <response code="200">Devuelve el producto actualizado.</response>
        /// <response code="400">Los datos no son válidos o la categoría no existe.</response>
        /// <response code="404">No existe un producto con ese id.</response>
        /// <response code="409">Ya existe otro producto con ese nombre en la categoría.</response>
        [Authorize(Roles = Seguridad.SoloAdministrador)]
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(Producto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Actualizar(int id, [FromBody] ProductoRequest solicitud)
        {
            var producto = await _productoQueries.ObtenerPorIdAsync(id);
            if (producto is null) return NotFound();

            var error = await ValidarAsync(solicitud, idActual: id);
            if (error is not null) return error;

            producto.CategoriaId = solicitud.CategoriaId;
            producto.Nombre = solicitud.Nombre.Trim();
            producto.Precio = solicitud.Precio;
            producto.Activo = solicitud.Activo;
            await _productoRepository.ActualizarAsync(producto);
            return Ok(producto);
        }

        /// <summary>
        /// Revisa que la categoría exista y que el nombre no se repita dentro de ella.
        /// </summary>
        private async Task<IActionResult?> ValidarAsync(ProductoRequest solicitud, int? idActual)
        {
            if (await _categoriaQueries.ObtenerPorIdAsync(solicitud.CategoriaId) is null)
                return BadRequest($"No existe la categoría {solicitud.CategoriaId}.");

            var nombre = solicitud.Nombre.Trim();
            var repetido = (await _productoQueries.ObtenerPorCategoriaAsync(solicitud.CategoriaId)).Any(p =>
                p.ProductoId != idActual &&
                string.Equals(p.Nombre.Trim(), nombre, StringComparison.OrdinalIgnoreCase));

            return repetido
                ? Conflict($"Ya existe un producto llamado \"{nombre}\" en esa categoría.")
                : null;
        }
    }

    /// <summary>
    /// Producto con los tamaños que se pueden elegir para él.
    /// </summary>
    public class ProductoDetalle : Producto
    {
        /// <summary>Tamaños activos de la categoría del producto (vacío si no maneja tamaños).</summary>
        public List<Tamano> Tamanos { get; set; } = new();
    }

    /// <summary>
    /// Datos para crear o editar un producto.
    /// </summary>
    public class ProductoRequest
    {
        /// <summary>Categoría a la que pertenece.</summary>
        [Range(1, int.MaxValue)]
        public int CategoriaId { get; set; }

        /// <summary>Nombre del producto. Máximo 100 caracteres.</summary>
        [Required, MaxLength(100), RegularExpression(@".*\S.*", ErrorMessage = "El nombre no puede estar vacío.")]
        public string Nombre { get; set; } = string.Empty;

        /// <summary>Precio base (el del tamaño más pequeño, si la categoría maneja tamaños).</summary>
        // Límites leídos en formato invariante: en un equipo en español "0.01" no se entendería.
        [Range(typeof(decimal), "0.01", "99999999",
            ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true)]
        public decimal Precio { get; set; }

        /// <summary>Si el producto se puede pedir. Por defecto, sí.</summary>
        public bool Activo { get; set; } = true;
    }
}
