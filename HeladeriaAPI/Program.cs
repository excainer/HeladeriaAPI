using System.Data;
using System.Reflection;
using HeladeriaAPI.Query.Implements;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Implements;
using HeladeriaAPI.Repository.Interfaces;

namespace HeladeriaAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Services.AddControllers();

            // Swagger con comentarios XML
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
                c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
            });

            // Conexión a la base de datos
            var cadenaConexion = builder.Configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException(
                    "Falta ConnectionStrings:DefaultConnection en appsettings.json");

            builder.Services.AddSingleton<IConexionFactory>(new ConexionFactory(cadenaConexion));

            // Los Repositories reciben un IDbConnection directo: una conexión por petición.
            builder.Services.AddScoped<IDbConnection>(sp =>
                sp.GetRequiredService<IConexionFactory>().CrearConexion());

            // Capa Query (lecturas)
            builder.Services.AddScoped<ICategoriaQueries, CategoriaQueries>();
            builder.Services.AddScoped<IProductoQueries, ProductoQueries>();
            builder.Services.AddScoped<IMesaQueries, MesaQueries>();
            builder.Services.AddScoped<IPedidoQueries, PedidoQueries>();
            builder.Services.AddScoped<ITamanoQueries, TamanoQueries>();

            // Capa Repository (escritura)
            builder.Services.AddScoped<IPedidoRepository, PedidoRepository>();
            builder.Services.AddScoped<IDetallePedidoRepository, DetallePedidoRepository>();
            builder.Services.AddScoped<ICategoriaRepository, CategoriaRepository>();
            builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
            builder.Services.AddScoped<ITamanoRepository, TamanoRepository>();

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }
            else
            {
                // En desarrollo el frontend llama a la API por http (proxy de Angular);
                // redirigir a https ahí rompería esas peticiones.
                app.UseHttpsRedirection();
            }
            app.UseAuthorization();
            app.MapControllers();

            app.Run();
        }
    }
}