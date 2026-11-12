using System.Data;
using Dapper;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Interfaces;

namespace HeladeriaAPI.Query.Implements
{
    /// <summary>
    /// Consultas sobre los usuarios del personal.
    /// </summary>
    public class UsuarioQueries : IUsuarioQueries
    {
        private const string Columnas = "UsuarioId, NombreUsuario, Nombre, ClaveHash, Rol, Activo";

        private readonly IDbConnection _conexion;

        public UsuarioQueries(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        public async Task<IEnumerable<Usuario>> ObtenerTodosAsync()
        {
            const string sql = $"SELECT {Columnas} FROM Usuarios ORDER BY Nombre";
            return await _conexion.QueryAsync<Usuario>(sql);
        }

        public async Task<Usuario?> ObtenerPorIdAsync(int id)
        {
            const string sql = $"SELECT {Columnas} FROM Usuarios WHERE UsuarioId = @Id";
            return await _conexion.QueryFirstOrDefaultAsync<Usuario>(sql, new { Id = id });
        }

        /// <summary>
        /// Busca por nombre de usuario sin distinguir mayúsculas (la intercalación de SQL Server no las distingue).
        /// </summary>
        public async Task<Usuario?> ObtenerPorNombreUsuarioAsync(string nombreUsuario)
        {
            const string sql = $"SELECT {Columnas} FROM Usuarios WHERE NombreUsuario = @NombreUsuario";
            return await _conexion.QueryFirstOrDefaultAsync<Usuario>(sql, new { NombreUsuario = nombreUsuario.Trim() });
        }
    }
}
