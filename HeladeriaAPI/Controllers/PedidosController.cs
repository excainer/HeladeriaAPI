using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Gestión de los pedidos de la heladería.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class PedidosController : ControllerBase
    {
        /// <summary>Flujo normal de un pedido, en orden.</summary>
        private static readonly string[] EstadosValidos =
            { "Pendiente", "En Preparacion", "Listo", "Entregado" };

        /// <summary>Estado final de un pedido anulado (fuera del flujo normal).</summary>
        private const string EstadoCancelado = "Cancelado";

        private readonly IPedidoQueries _pedidoQueries;
        private readonly IMesaQueries _mesaQueries;
        private readonly IProductoQueries _productoQueries;
        private readonly ITamanoQueries _tamanoQueries;
        private readonly IPedidoRepository _pedidoRepository;

        public PedidosController(
            IPedidoQueries pedidoQueries,
            IMesaQueries mesaQueries,
            IProductoQueries productoQueries,
            ITamanoQueries tamanoQueries,
            IPedidoRepository pedidoRepository)
        {
            _pedidoQueries = pedidoQueries;
            _mesaQueries = mesaQueries;
            _productoQueries = productoQueries;
            _tamanoQueries = tamanoQueries;
            _pedidoRepository = pedidoRepository;
        }

        /// <summary>
        /// Obtiene la lista de todos los pedidos.
        /// </summary>
        /// <response code="200">Devuelve la lista de pedidos.</response>
        [Authorize]
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Pedido>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTodos()
        {
            return Ok(await _pedidoQueries.ObtenerTodosAsync());
        }

        /// <summary>
        /// Obtiene un pedido por su identificador.
        /// </summary>
        /// <param name="id">Identificador del pedido.</param>
        /// <response code="200">Devuelve el pedido.</response>
        /// <response code="404">No existe un pedido con ese id.</response>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(Pedido), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ObtenerPorId(int id)
        {
            var pedido = await _pedidoQueries.ObtenerPorIdAsync(id);
            if (pedido is null) return NotFound();
            return Ok(pedido);
        }

        /// <summary>
        /// Filtra los pedidos por estado.
        /// </summary>
        /// <param name="estado">Estado del pedido (Pendiente, En Preparacion, Listo, Entregado).</param>
        /// <response code="200">Devuelve los pedidos con ese estado.</response>
        [Authorize]
        [HttpGet("estado/{estado}")]
        [ProducesResponseType(typeof(IEnumerable<Pedido>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerPorEstado(string estado)
        {
            return Ok(await _pedidoQueries.ObtenerPorEstadoAsync(estado));
        }

        /// <summary>
        /// Obtiene los pedidos de una mesa.
        /// </summary>
        /// <param name="mesaId">Identificador de la mesa.</param>
        /// <response code="200">Devuelve los pedidos de la mesa.</response>
        [Authorize]
        [HttpGet("mesa/{mesaId:int}")]
        [ProducesResponseType(typeof(IEnumerable<Pedido>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerPorMesa(int mesaId)
        {
            return Ok(await _pedidoQueries.ObtenerPorMesaAsync(mesaId));
        }

        /// <summary>
        /// Obtiene los detalles (líneas) de un pedido.
        /// </summary>
        /// <param name="id">Identificador del pedido.</param>
        /// <response code="200">Devuelve los detalles del pedido.</response>
        [HttpGet("{id:int}/detalles")]
        [ProducesResponseType(typeof(IEnumerable<DetallePedido>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerDetalles(int id)
        {
            return Ok(await _pedidoQueries.ObtenerDetallesPorPedidoAsync(id));
        }

        /// <summary>
        /// Crea un pedido con sus detalles. Queda en estado "Pendiente".
        /// El precio de cada ítem se toma del catálogo (no lo envía el cliente) y el total se calcula solo.
        /// </summary>
        /// <param name="solicitud">Mesa y lista de ítems del pedido.</param>
        /// <response code="201">Pedido creado.</response>
        /// <response code="400">Los datos no son válidos, algún producto no está disponible o falta elegir un tamaño válido.</response>
        /// <response code="404">No existe la mesa o alguno de los productos indicados.</response>
        [HttpPost]
        [ProducesResponseType(typeof(Pedido), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Crear([FromBody] CrearPedidoRequest solicitud)
        {
            var mesa = await _mesaQueries.ObtenerPorIdAsync(solicitud.MesaId);
            if (mesa is null)
                return NotFound($"No existe la mesa {solicitud.MesaId}.");

            var productos = (await _productoQueries.ObtenerPorIdsAsync(
                    solicitud.Detalles.Select(d => d.ProductoId)))
                .ToDictionary(p => p.ProductoId);

            // Tamaños de todas las categorías involucradas, en una sola consulta.
            var tamanos = (await _tamanoQueries.ObtenerPorCategoriasAsync(
                    productos.Values.Select(p => p.CategoriaId)))
                .ToList();

            var detalles = new List<DetallePedido>();
            foreach (var item in solicitud.Detalles)
            {
                if (!productos.TryGetValue(item.ProductoId, out var producto))
                    return NotFound($"No existe el producto {item.ProductoId}.");

                if (!producto.Activo)
                    return BadRequest($"El producto \"{producto.Nombre}\" no está disponible.");

                var tamanosDelProducto = tamanos
                    .Where(t => t.CategoriaId == producto.CategoriaId && t.Activo)
                    .ToList();

                Tamano? tamano = null;
                if (item.TamanoId is not null)
                {
                    tamano = tamanosDelProducto.FirstOrDefault(t => t.TamanoId == item.TamanoId);
                    if (tamano is null)
                        return BadRequest($"El tamaño {item.TamanoId} no está disponible para \"{producto.Nombre}\".");
                }
                else if (tamanosDelProducto.Count > 0)
                {
                    var opciones = string.Join(", ", tamanosDelProducto.Select(t => $"{t.Nombre} ({t.TamanoId})"));
                    return BadRequest($"Elige un tamaño para \"{producto.Nombre}\": {opciones}.");
                }

                detalles.Add(new DetallePedido
                {
                    ProductoId = producto.ProductoId,
                    TamanoId = tamano?.TamanoId,
                    Cantidad = item.Cantidad,
                    // Precio del catálogo: base del producto + adicional del tamaño elegido.
                    PrecioUnitario = producto.Precio + (tamano?.PrecioAdicional ?? 0),
                    Sabores = item.Sabores,
                    Toppings = item.Toppings,
                    Observaciones = item.Observaciones
                });
            }

            // Pedido y detalles se guardan en una sola transacción: o todo o nada.
            var pedidoId = await _pedidoRepository.CrearConDetallesAsync(
                new Pedido { MesaId = solicitud.MesaId }, detalles);

            var creado = await _pedidoQueries.ObtenerPorIdAsync(pedidoId);
            return CreatedAtAction(nameof(ObtenerPorId), new { id = pedidoId }, creado);
        }

        /// <summary>
        /// Avanza el estado de un pedido. Solo se permite pasar al siguiente estado del flujo:
        /// Pendiente → En Preparacion → Listo → Entregado.
        /// </summary>
        /// <param name="id">Identificador del pedido.</param>
        /// <param name="solicitud">Nuevo estado: Pendiente, En Preparacion, Listo o Entregado.</param>
        /// <response code="204">Estado actualizado.</response>
        /// <response code="400">El estado no es válido.</response>
        /// <response code="404">No existe un pedido con ese id.</response>
        /// <response code="409">El cambio no respeta el orden del flujo (por ejemplo, retroceder o saltar un paso).</response>
        [Authorize]
        [HttpPut("{id:int}/estado")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> ActualizarEstado(int id, [FromBody] ActualizarEstadoRequest solicitud)
        {
            var estado = EstadosValidos.FirstOrDefault(e =>
                string.Equals(e, solicitud.Estado, StringComparison.OrdinalIgnoreCase));

            if (estado is null)
                return BadRequest($"Estado no válido. Valores permitidos: {string.Join(", ", EstadosValidos)}.");

            var pedido = await _pedidoQueries.ObtenerPorIdAsync(id);
            if (pedido is null) return NotFound();

            if (pedido.Estado == EstadoCancelado)
                return Conflict("El pedido fue cancelado y no se puede cambiar.");

            var posicionActual = Array.IndexOf(EstadosValidos, pedido.Estado);
            var posicionNueva = Array.IndexOf(EstadosValidos, estado);

            if (posicionActual < 0 || posicionNueva != posicionActual + 1)
            {
                var mensaje = posicionActual == EstadosValidos.Length - 1
                    ? "El pedido ya fue entregado y no se puede cambiar."
                    : posicionActual < 0
                        ? $"El pedido está en un estado desconocido (\"{pedido.Estado}\")."
                        : $"No se puede pasar de \"{pedido.Estado}\" a \"{estado}\". " +
                          $"El siguiente estado es \"{EstadosValidos[posicionActual + 1]}\".";
                return Conflict(mensaje);
            }

            // Solo cambia si nadie lo modificó entre la lectura y ahora (por ejemplo, otra pantalla lo canceló).
            if (!await _pedidoRepository.CambiarEstadoAsync(id, pedido.Estado, estado))
                return Conflict("Otra persona acaba de cambiar este pedido. Actualiza la pantalla.");

            return NoContent();
        }

        /// <summary>
        /// Cancela un pedido. Solo se puede mientras está "Pendiente" (antes de que la cocina empiece a prepararlo).
        /// Un pedido cancelado no cuenta en las ventas ni deja la mesa ocupada.
        /// </summary>
        /// <param name="id">Identificador del pedido.</param>
        /// <response code="204">Pedido cancelado.</response>
        /// <response code="401">No hay sesión del personal.</response>
        /// <response code="404">No existe un pedido con ese id.</response>
        /// <response code="409">El pedido ya no está pendiente.</response>
        [Authorize]
        [HttpPost("{id:int}/cancelar")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Cancelar(int id)
        {
            var pedido = await _pedidoQueries.ObtenerPorIdAsync(id);
            if (pedido is null) return NotFound();

            if (pedido.Estado == EstadoCancelado)
                return Conflict("El pedido ya estaba cancelado.");

            if (pedido.Estado != EstadosValidos[0] ||
                !await _pedidoRepository.CambiarEstadoAsync(id, EstadosValidos[0], EstadoCancelado))
            {
                return Conflict("Solo se pueden cancelar pedidos pendientes: la cocina ya empezó a prepararlo.");
            }

            return NoContent();
        }
    }

    /// <summary>
    /// Datos para crear un pedido.
    /// </summary>
    public class CrearPedidoRequest
    {
        /// <summary>Mesa donde se genera el pedido.</summary>
        [Range(1, int.MaxValue)]
        public int MesaId { get; set; }

        /// <summary>Ítems del pedido (mínimo uno).</summary>
        [Required, MinLength(1)]
        public List<DetalleSolicitud> Detalles { get; set; } = new();
    }

    /// <summary>
    /// Ítem de un pedido.
    /// </summary>
    public class DetalleSolicitud
    {
        /// <summary>Producto base o tamaño seleccionado.</summary>
        [Range(1, int.MaxValue)]
        public int ProductoId { get; set; }

        /// <summary>
        /// Tamaño elegido (ver <c>GET /api/Productos/{id}</c>). Obligatorio si la categoría
        /// del producto tiene tamaños activos; se omite si no los tiene.
        /// </summary>
        [Range(1, int.MaxValue)]
        public int? TamanoId { get; set; }

        /// <summary>Cantidad solicitada.</summary>
        [Range(1, 1000)]
        public int Cantidad { get; set; }

        /// <summary>Sabores elegidos (ej. "Vainilla, Chocolate"). Máximo 200 caracteres.</summary>
        [MaxLength(200)]
        public string? Sabores { get; set; }

        /// <summary>Toppings o adicionales (ej. "Chispas, Maní"). Máximo 200 caracteres.</summary>
        [MaxLength(200)]
        public string? Toppings { get; set; }

        /// <summary>Observaciones del cliente (ej. "Sin crema"). Máximo 300 caracteres.</summary>
        [MaxLength(300)]
        public string? Observaciones { get; set; }
    }

    /// <summary>
    /// Datos para cambiar el estado de un pedido.
    /// </summary>
    public class ActualizarEstadoRequest
    {
        /// <summary>Nuevo estado del pedido.</summary>
        [Required]
        public string Estado { get; set; } = string.Empty;
    }
}