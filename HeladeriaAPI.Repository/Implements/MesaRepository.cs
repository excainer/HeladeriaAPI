using System.Data;
using System.Threading.Tasks;
using Dapper;
using HeladeriaAPI.Repository.Interfaces;

namespace HeladeriaAPI.Repository.Implements
{
    /// <summary>
    /// Operaciones de escritura sobre las mesas.
    /// </summary>
    public class MesaRepository : IMesaRepository
    {
        private readonly IDbConnection _conexion;

        public MesaRepository(IDbConnection conexion)
        {
            _conexion = conexion;
        }

        /// <summary>
        /// Marca la mesa como liberada ahora: los pedidos anteriores ya no la ocupan.
        /// Devuelve false si la mesa no existe.
        /// </summary>
        public async Task<bool> LiberarAsync(int mesaId)
        {
            const string sql = "UPDATE Mesas SET LiberadaEn = GETDATE() WHERE MesaId = @MesaId;";
            return await _conexion.ExecuteAsync(sql, new { MesaId = mesaId }) > 0;
        }
    }
}
