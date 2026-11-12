using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Trabajador que puede entrar a la zona del personal. Los clientes no tienen usuario.
    /// </summary>
    [Table("Usuarios")]
    public class Usuario
    {
        /// <summary>Roles posibles.</summary>
        public const string RolAdministrador = "Administrador";

        /// <summary>Atiende cocina y pedidos, sin editar el catálogo ni los usuarios.</summary>
        public const string RolEmpleado = "Empleado";

        /// <summary>
        /// Identificador único del usuario.
        /// </summary>
        [Key]
        public int UsuarioId { get; set; }

        /// <summary>
        /// Nombre con el que inicia sesión (único, sin distinguir mayúsculas).
        /// </summary>
        public string NombreUsuario { get; set; } = string.Empty;

        /// <summary>
        /// Nombre visible del trabajador.
        /// </summary>
        public string Nombre { get; set; } = string.Empty;

        /// <summary>
        /// Contraseña cifrada (PBKDF2, formato de ASP.NET Identity). Nunca se guarda ni se envía la clave original.
        /// </summary>
        public string ClaveHash { get; set; } = string.Empty;

        /// <summary>
        /// "Administrador" o "Empleado".
        /// </summary>
        public string Rol { get; set; } = RolEmpleado;

        /// <summary>
        /// Un usuario inactivo no puede iniciar sesión.
        /// </summary>
        public bool Activo { get; set; } = true;
    }
}
