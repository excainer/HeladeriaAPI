using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Tamaño que se puede elegir para los productos de una categoría (ej. Pequeño, Mediano, Grande).
    /// Si una categoría tiene tamaños activos, al pedir uno de sus productos hay que elegir un tamaño.
    /// </summary>
    [Table("Tamanos")]
    public class Tamano
    {
        /// <summary>
        /// Identificador único del tamaño.
        /// </summary>
        [Key]
        public int TamanoId { get; set; }

        /// <summary>
        /// Categoría a cuyos productos aplica este tamaño.
        /// </summary>
        public int CategoriaId { get; set; }

        /// <summary>
        /// Nombre visible del tamaño (ej. "Mediano").
        /// </summary>
        public string Nombre { get; set; } = string.Empty;

        /// <summary>
        /// Valor que se suma al precio base del producto (0 para el tamaño base).
        /// </summary>
        public decimal PrecioAdicional { get; set; }

        /// <summary>
        /// Posición en la que se muestra (de menor a mayor).
        /// </summary>
        public int Orden { get; set; }

        /// <summary>
        /// Indica si el tamaño se puede elegir actualmente.
        /// </summary>
        public bool Activo { get; set; }
    }
}
