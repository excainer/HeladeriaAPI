using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HeladeriaAPI.Controllers
{
    /// <summary>
    /// Inicio y cierre de sesión del personal. Los clientes no necesitan sesión.
    /// La sesión viaja en una cookie HttpOnly (el navegador la envía sola; JavaScript no puede leerla).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AuthController : ControllerBase
    {
        private const string MensajeCredenciales = "Usuario o contraseña incorrectos.";

        private readonly IUsuarioQueries _usuarioQueries;
        private readonly IUsuarioRepository _usuarioRepository;
        private readonly IPasswordHasher<Usuario> _hasher;

        public AuthController(
            IUsuarioQueries usuarioQueries,
            IUsuarioRepository usuarioRepository,
            IPasswordHasher<Usuario> hasher)
        {
            _usuarioQueries = usuarioQueries;
            _usuarioRepository = usuarioRepository;
            _hasher = hasher;
        }

        /// <summary>
        /// Inicia sesión con usuario y contraseña. Máximo 10 intentos por minuto.
        /// </summary>
        /// <param name="solicitud">Usuario y contraseña.</param>
        /// <response code="200">Sesión iniciada; devuelve los datos del usuario.</response>
        /// <response code="401">Usuario o contraseña incorrectos, o usuario inactivo.</response>
        /// <response code="429">Demasiados intentos; espera un minuto.</response>
        [HttpPost("login")]
        [AllowAnonymous]
        [EnableRateLimiting(Seguridad.PoliticaLogin)]
        [ProducesResponseType(typeof(UsuarioSesion), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        public async Task<IActionResult> Login([FromBody] LoginRequest solicitud)
        {
            var usuario = await _usuarioQueries.ObtenerPorNombreUsuarioAsync(solicitud.NombreUsuario);

            if (usuario is null || !usuario.Activo)
            {
                // Se verifica igual una clave para tardar lo mismo y no revelar qué usuarios existen.
                _hasher.VerifyHashedPassword(new Usuario(), Seguridad.HashDeRelleno, solicitud.Clave);
                return Unauthorized(MensajeCredenciales);
            }

            var resultado = _hasher.VerifyHashedPassword(usuario, usuario.ClaveHash, solicitud.Clave);
            if (resultado == PasswordVerificationResult.Failed)
                return Unauthorized(MensajeCredenciales);

            if (resultado == PasswordVerificationResult.SuccessRehashNeeded)
            {
                usuario.ClaveHash = _hasher.HashPassword(usuario, solicitud.Clave);
                await _usuarioRepository.ActualizarAsync(usuario);
            }

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                Seguridad.CrearPrincipal(usuario));

            return Ok(UsuarioSesion.Desde(usuario));
        }

        /// <summary>
        /// Cierra la sesión actual.
        /// </summary>
        /// <response code="204">Sesión cerrada.</response>
        [HttpPost("logout")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return NoContent();
        }

        /// <summary>
        /// Devuelve el usuario con sesión iniciada.
        /// </summary>
        /// <response code="200">Datos del usuario actual.</response>
        /// <response code="401">No hay sesión iniciada.</response>
        [HttpGet("yo")]
        [Authorize]
        [ProducesResponseType(typeof(UsuarioSesion), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Yo()
        {
            var usuario = await _usuarioQueries.ObtenerPorIdAsync(Seguridad.IdUsuario(User));
            if (usuario is null || !usuario.Activo) return Unauthorized();
            return Ok(UsuarioSesion.Desde(usuario));
        }

        /// <summary>
        /// Cambia la contraseña del usuario actual.
        /// </summary>
        /// <param name="solicitud">Contraseña actual y nueva (mínimo 8 caracteres).</param>
        /// <response code="204">Contraseña cambiada.</response>
        /// <response code="400">La contraseña actual no es correcta o la nueva no es válida.</response>
        /// <response code="401">No hay sesión iniciada.</response>
        [HttpPut("clave")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> CambiarClave([FromBody] CambiarClaveRequest solicitud)
        {
            var usuario = await _usuarioQueries.ObtenerPorIdAsync(Seguridad.IdUsuario(User));
            if (usuario is null || !usuario.Activo) return Unauthorized();

            if (_hasher.VerifyHashedPassword(usuario, usuario.ClaveHash, solicitud.ClaveActual) == PasswordVerificationResult.Failed)
                return BadRequest("La contraseña actual no es correcta.");

            usuario.ClaveHash = _hasher.HashPassword(usuario, solicitud.ClaveNueva);
            await _usuarioRepository.ActualizarAsync(usuario);
            return NoContent();
        }
    }

    /// <summary>
    /// Datos públicos del usuario con sesión (nunca incluye la contraseña).
    /// </summary>
    public class UsuarioSesion
    {
        /// <summary>Identificador del usuario.</summary>
        public int UsuarioId { get; set; }

        /// <summary>Nombre con el que inicia sesión.</summary>
        public string NombreUsuario { get; set; } = string.Empty;

        /// <summary>Nombre visible.</summary>
        public string Nombre { get; set; } = string.Empty;

        /// <summary>"Administrador" o "Empleado".</summary>
        public string Rol { get; set; } = string.Empty;

        /// <summary>Indica si puede iniciar sesión.</summary>
        public bool Activo { get; set; }

        internal static UsuarioSesion Desde(Usuario u) => new()
        {
            UsuarioId = u.UsuarioId,
            NombreUsuario = u.NombreUsuario,
            Nombre = u.Nombre,
            Rol = u.Rol,
            Activo = u.Activo
        };
    }

    /// <summary>
    /// Datos para iniciar sesión.
    /// </summary>
    public class LoginRequest
    {
        /// <summary>Nombre de usuario.</summary>
        [Required, MaxLength(50)]
        public string NombreUsuario { get; set; } = string.Empty;

        /// <summary>Contraseña.</summary>
        [Required, MaxLength(200)]
        public string Clave { get; set; } = string.Empty;
    }

    /// <summary>
    /// Datos para cambiar la contraseña propia.
    /// </summary>
    public class CambiarClaveRequest
    {
        /// <summary>Contraseña actual.</summary>
        [Required, MaxLength(200)]
        public string ClaveActual { get; set; } = string.Empty;

        /// <summary>Contraseña nueva (mínimo 8 caracteres).</summary>
        [Required, MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres."), MaxLength(200)]
        public string ClaveNueva { get; set; } = string.Empty;
    }

    /// <summary>
    /// Utilidades de sesión compartidas por los controllers y por Program.cs.
    /// </summary>
    public static class Seguridad
    {
        /// <summary>Nombre de la política que limita los intentos de inicio de sesión.</summary>
        public const string PoliticaLogin = "login";

        /// <summary>Roles que pueden administrar el catálogo y los usuarios.</summary>
        public const string SoloAdministrador = Usuario.RolAdministrador;

        /// <summary>
        /// Hash válido de una clave aleatoria, usado para que un usuario inexistente tarde lo mismo en responder.
        /// </summary>
        public static readonly string HashDeRelleno =
            new PasswordHasher<Usuario>().HashPassword(new Usuario(), Guid.NewGuid().ToString());

        public static ClaimsPrincipal CrearPrincipal(Usuario usuario)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.UsuarioId.ToString()),
                new Claim(ClaimTypes.Name, usuario.NombreUsuario),
                new Claim(ClaimTypes.GivenName, usuario.Nombre),
                new Claim(ClaimTypes.Role, usuario.Rol)
            };
            return new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        }

        public static int IdUsuario(ClaimsPrincipal principal) =>
            int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : 0;
    }
}
