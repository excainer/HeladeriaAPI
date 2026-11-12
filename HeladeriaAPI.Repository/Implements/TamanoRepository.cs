using System.Data;
using System.Threading.Tasks;
using Dapper.Contrib.Extensions;
using HeladeriaAPI.Models;
using HeladeriaAPI.Repository.Interfaces;

namespace HeladeriaAPI.Repository.Implements
{
    /// <summary>
    /// Operaciones de escritura sobre el catálogo: crear y editar un tamaño.
    /// </summary>
    public class TamanoRepository : ITamanoRepository
    {
        private readonly IDbConnection _conexion;

        public TamanoRepository(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Crea el registro y devuelve su identificador.
        /// </summary>
        public async Task<int> CrearAsync(Tamano entidad)
        {
            var id = await _conexion.InsertAsync(entidad);
            return (int)id;
        }

        /// <summary>
        /// Actualiza todos los campos del registro. Devuelve false si no existe.
        /// </summary>
        public Task<bool> ActualizarAsync(Tamano entidad)
        {
            return _conexion.UpdateAsync(entidad);
        }
    }
}
