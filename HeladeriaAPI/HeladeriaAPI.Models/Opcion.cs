using Dapper.Contrib.Extensions;

namespace HeladeriaAPI.Models
{
    /// <summary>
    /// Sabor o topping que se puede elegir para los productos de una categoría (ej. Vainilla, Maní).
    /// No cambia el precio. Si una categoría no tiene opciones activas, sus productos no se personalizan.
    /// </summary>
    [Table("Opciones")]
    public class Opcion
    {
        /// <summary>Valor de <see cref="Tipo"/> para los sabores.</summary>
        public const string TipoSabor = "Sabor";

        /// <summary>Valor de <see cref="Tipo"/> para los toppings.</summary>
        public const string TipoTopping = "Topping";

        /// <summary>
        /// Identificador único de la opción.
        /// </summary>
        [Key]
        public int OpcionId { get; set; }

        /// <summary>
        /// Categoría a cuyos productos aplica esta opción.
        /// </summary>
        public int CategoriaId { get; set; }

        /// <summary>
        /// "Sabor" o "Topping".
        /// </summary>
        public string Tipo { get; set; } = TipoSabor;

        /// <summary>
        /// Nombre visible de la opción (ej. "Chocolate").
        /// </summary>
        public string Nombre { get; set; } = string.Empty;

        /// <summary>
        /// Posición en la que se muestra (de menor a mayor).
        /// </summary>
        public int Orden { get; set; }

        /// <summary>
        /// Indica si la opción se puede elegir actualmente.
        /// </summary>
        public bool Activo { get; set; }
    }
}
