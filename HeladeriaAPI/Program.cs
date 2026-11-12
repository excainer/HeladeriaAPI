using System.Data;
using System.Reflection;
using System.Security.Claims;
using System.Threading.RateLimiting;
using HeladeriaAPI.Controllers;
using HeladeriaAPI.Models;
using HeladeriaAPI.Query.Implements;
using HeladeriaAPI.Query.Interfaces;
using HeladeriaAPI.Repository.Implements;
using HeladeriaAPI.Repository.Interfaces;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;

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
            builder.Services.AddScoped<IUsuarioQueries, UsuarioQueries>();

            // Capa Repository (escritura)
            builder.Services.AddScoped<IPedidoRepository, PedidoRepository>();
            builder.Services.AddScoped<IDetallePedidoRepository, DetallePedidoRepository>();
            builder.Services.AddScoped<ICategoriaRepository, CategoriaRepository>();
            builder.Services.AddScoped<IProductoRepository, ProductoRepository>();
            builder.Services.AddScoped<ITamanoRepository, TamanoRepository>();
            builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();

            // Sesión del personal: cookie HttpOnly. Los clientes no inician sesión.
            builder.Services.AddSingleton<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();
            builder.Services
                .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(opciones =>
                {
                    opciones.Cookie.Name = "HeladApp.Sesion";
                    opciones.Cookie.HttpOnly = true;
                    // Strict: el navegador no envía la cookie desde otros sitios (protege contra CSRF).
                    opciones.Cookie.SameSite = SameSiteMode.Strict;
                    opciones.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                    opciones.ExpireTimeSpan = TimeSpan.FromHours(12);
                    opciones.SlidingExpiration = true;

                    // Es una API: sin sesión responde 401 y sin permiso 403 (en vez de redirigir a una página).
                    opciones.Events.OnRedirectToLogin = contexto =>
                    {
                        contexto.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    };
                    opciones.Events.OnRedirectToAccessDenied = contexto =>
                    {
                        contexto.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    };

                    // En cada petición se confirma que el usuario siga activo y con el mismo rol,
                    // así desactivar a alguien lo saca de inmediato aunque conserve la cookie.
                    opciones.Events.OnValidatePrincipal = async contexto =>
                    {
                        var consultas = contexto.HttpContext.RequestServices.GetRequiredService<IUsuarioQueries>();
                        var usuario = await consultas.ObtenerPorIdAsync(Seguridad.IdUsuario(contexto.Principal!));
                        if (usuario is null || !usuario.Activo)
                        {
                            contexto.RejectPrincipal();
                            return;
                        }
                        if (contexto.Principal!.FindFirstValue(ClaimTypes.Role) != usuario.Rol ||
                            contexto.Principal!.FindFirstValue(ClaimTypes.GivenName) != usuario.Nombre)
                        {
                            contexto.ReplacePrincipal(Seguridad.CrearPrincipal(usuario));
                            contexto.ShouldRenew = true;
                        }
                    };
                });
            builder.Services.AddAuthorization();

            // Máximo 10 intentos de inicio de sesión por minuto desde la misma dirección.
            builder.Services.AddRateLimiter(opciones =>
            {
                opciones.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                opciones.AddPolicy(Seguridad.PoliticaLogin, contexto =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        contexto.Connection.RemoteIpAddress?.ToString() ?? "desconocida",
                        _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
            });

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
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();

            app.Run();
        }
    }
}
