using System.Data;
using System.Threading.Tasks;
using Dapper.Contrib.Extensions;
using HeladeriaAPI.Models;
using HeladeriaAPI.Repository.Interfaces;

namespace HeladeriaAPI.Repository.Implements
{
    /// <summary>
    /// Operaciones de escritura de usuarios: crear y editar un usuario del personal.
    /// </summary>
    public class UsuarioRepository : IUsuarioRepository
    {
        private readonly IDbConnection _conexion;

        public UsuarioRepository(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Crea el registro y devuelve su identificador.
        /// </summary>
        public async Task<int> CrearAsync(Usuario entidad)
        {
            var id = await _conexion.InsertAsync(entidad);
            return (int)id;
        }

        /// <summary>
        /// Actualiza todos los campos del registro. Devuelve false si no existe.
        /// </summary>
        public Task<bool> ActualizarAsync(Usuario entidad)
        {
            return _conexion.UpdateAsync(entidad);
        }
    }
}
