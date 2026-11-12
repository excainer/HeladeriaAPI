using System.ComponentModel.DataAnnotations;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Administración de los usuarios del personal (solo administradores).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize(Roles = Seguridad.SoloAdministrador)]
    public class UsuariosController : ControllerBase
    {
        private static readonly string[] RolesValidos = { Usuario.RolAdministrador, Usuario.RolEmpleado };

        private readonly IUsuarioQueries _usuarioQueries;
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IPasswordHasher<Usuario> _hasher;

        public UsuariosController(
            IUsuarioQueries usuarioQueries,
            IUsuarioRepository usuarioRepository,
            IPasswordHasher<Usuario> hasher)
        {
            _usuarioQueries = usuarioQueries;
            _usuarioRepository = usuarioRepository;
            _hasher = hasher;
        }

        /// <summary>
        /// Lista los usuarios del personal (sin contraseñas).
        /// </summary>
        /// <response code="200">Devuelve la lista de usuarios.</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<UsuarioSesion>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ObtenerTodos()
        {
            return Ok((await _usuarioQueries.ObtenerTodosAsync()).Select(UsuarioSesion.Desde));
        }

        /// <summary>
        /// Crea un usuario del personal.
        /// </summary>
        /// <param name="solicitud">Usuario, nombre, contraseña inicial y rol.</param>
        /// <response code="201">Usuario creado.</response>
        /// <response code="400">Los datos no son válidos.</response>
        /// <response code="409">El nombre de usuario ya existe.</response>
        [HttpPost]
        [ProducesResponseType(typeof(UsuarioSesion), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Crear([FromBody] CrearUsuarioRequest solicitud)
        {
            var rol = NormalizarRol(solicitud.Rol);
            if (rol is null) return BadRequest($"Rol no válido. Valores permitidos: {string.Join(", ", RolesValidos)}.");

            var nombreUsuario = solicitud.NombreUsuario.Trim();
            if (await _usuarioQueries.ObtenerPorNombreUsuarioAsync(nombreUsuario) is not null)
                return Conflict($"Ya existe el usuario \"{nombreUsuario}\".");

            var usuario = new Usuario
            {
                NombreUsuario = nombreUsuario,
                Nombre = solicitud.Nombre.Trim(),
                Rol = rol,
                Activo = true
            };
            usuario.ClaveHash = _hasher.HashPassword(usuario, solicitud.Clave);
            usuario.UsuarioId = await _usuarioRepository.CrearAsync(usuario);

            return CreatedAtAction(nameof(ObtenerTodos), null, UsuarioSesion.Desde(usuario));
        }

        /// <summary>
        /// Edita nombre, rol o estado de un usuario y, opcionalmente, le asigna una contraseña nueva.
        /// Un administrador no puede quitarse su propio rol ni desactivarse (para no quedar sin acceso).
        /// </summary>
        /// <param name="id">Identificador del usuario.</param>
        /// <param name="solicitud">Datos nuevos.</param>
        /// <response code="200">Devuelve el usuario actualizado.</response>
        /// <response code="400">Los datos no son válidos.</response>
        /// <response code="404">No existe un usuario con ese id.</response>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(UsuarioSesion), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Actualizar(int id, [FromBody] ActualizarUsuarioRequest solicitud)
        {
            var usuario = await _usuarioQueries.ObtenerPorIdAsync(id);
            if (usuario is null) return NotFound();

            var rol = NormalizarRol(solicitud.Rol);
            if (rol is null) return BadRequest($"Rol no válido. Valores permitidos: {string.Join(", ", RolesValidos)}.");

            if (id == Seguridad.IdUsuario(User) && (!solicitud.Activo || rol != Usuario.RolAdministrador))
                return BadRequest("No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.");

            usuario.Nombre = solicitud.Nombre.Trim();
            usuario.Rol = rol;
            usuario.Activo = solicitud.Activo;
            if (!string.IsNullOrEmpty(solicitud.ClaveNueva))
                usuario.ClaveHash = _hasher.HashPassword(usuario, solicitud.ClaveNueva);

            await _usuarioRepository.ActualizarAsync(usuario);
            return Ok(UsuarioSesion.Desde(usuario));
        }

        private static string? NormalizarRol(string rol) =>
            RolesValidos.FirstOrDefault(r => string.Equals(r, rol?.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Datos para crear un usuario del personal.
    /// </summary>
    public class CrearUsuarioRequest
    {
        /// <summary>Nombre para iniciar sesión: 3 a 50 letras, números, punto, guion o guion bajo.</summary>
        [Required, RegularExpression(@"^\s*[A-Za-z0-9._-]{3,50}\s*$",
            ErrorMessage = "El usuario debe tener de 3 a 50 letras, números, punto, guion o guion bajo, sin espacios.")]
        public string NombreUsuario { get; set; } = string.Empty;

        /// <summary>Nombre visible del trabajador.</summary>
        [Required, MaxLength(100), RegularExpression(@".*\S.*", ErrorMessage = "El nombre no puede estar vacío.")]
        public string Nombre { get; set; } = string.Empty;

        /// <summary>Contraseña inicial (mínimo 8 caracteres).</summary>
        [Required, MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres."), MaxLength(200)]
        public string Clave { get; set; } = string.Empty;

        /// <summary>"Administrador" o "Empleado".</summary>
        [Required]
        public string Rol { get; set; } = Usuario.RolEmpleado;
    }

    /// <summary>
    /// Datos para editar un usuario del personal.
    /// </summary>
    public class ActualizarUsuarioRequest
    {
        /// <summary>Nombre visible del trabajador.</summary>
        [Required, MaxLength(100), RegularExpression(@".*\S.*", ErrorMessage = "El nombre no puede estar vacío.")]
        public string Nombre { get; set; } = string.Empty;

        /// <summary>"Administrador" o "Empleado".</summary>
        [Required]
        public string Rol { get; set; } = Usuario.RolEmpleado;

        /// <summary>Si puede iniciar sesión.</summary>
        public bool Activo { get; set; } = true;

        /// <summary>Si se envía, reemplaza la contraseña (mínimo 8 caracteres). Vacío = no cambia.</summary>
        [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres."), MaxLength(200)]
        public string? ClaveNueva { get; set; }
    }
}
