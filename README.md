<p align="center">
  <img src="docs/portada.svg" alt="HeladApp · HeladeriaAPI — Pide desde tu mesa, sin filas" width="100%">
</p>

# HeladeriaAPI

API REST en .NET 10 para gestionar pedidos de una heladería. Usa Dapper (Dapper.Contrib) con SQL Server y Swagger para probar los endpoints. Incluye un frontend en Angular (HeladApp) para clientes y personal.

## Estructura

- `HeladeriaAPI`: proyecto Web API (Controllers, Swagger/XML, `Program.cs`).
- `HeladeriaAPI.Models`: clases de las tablas.
- `HeladeriaAPI.Query`: consultas de lectura (SELECT).
- `HeladeriaAPI.Repository`: operaciones de escritura (crear pedido, actualizar estado).
- `BaseDeDatos/script.sql`: script para crear la base de datos.
- `Frontend`: aplicación Angular (ver la sección "Frontend").

## Requisitos

- .NET SDK 10
- SQL Server (local, Express, LocalDB o en Docker)
- Node.js 20 o superior (solo para el frontend)

## 1. Crear la base de datos

Ejecuta `BaseDeDatos/script.sql` en SQL Server Management Studio (o `sqlcmd`). Crea la base `HeladeriaAPI_DB`, sus tablas y datos de ejemplo (4 categorías, 8 productos y 5 mesas). Se puede ejecutar más de una vez sin duplicar datos.

Con `sqlcmd`, por ejemplo usando LocalDB (viene con Visual Studio):

```
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i BaseDeDatos\script.sql
```

## 2. Configurar la cadena de conexión

Por defecto (`appsettings.json`) la API se conecta a `localhost` con autenticación de Windows. Si tu servidor es otro o usa usuario y contraseña, no subas la contraseña al repositorio: guárdala en tu equipo con user-secrets, reemplazando `TU_USUARIO`, `TU_CLAVE` y el servidor si hace falta:

```
dotnet user-secrets init --project HeladeriaAPI\HeladeriaAPI.csproj
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=HeladeriaAPI_DB;User Id=TU_USUARIO;Password=TU_CLAVE;TrustServerCertificate=True;" --project HeladeriaAPI\HeladeriaAPI.csproj
```

El puerto `1433` es el predeterminado de SQL Server. Cámbialo si tu instancia usa otro. Para LocalDB usa `Server=(localdb)\MSSQLLocalDB;Database=HeladeriaAPI_DB;Trusted_Connection=True;TrustServerCertificate=True;`.

## 3. Ejecutar

```
dotnet run --project HeladeriaAPI\HeladeriaAPI.csproj --launch-profile http
```

Abre `http://localhost:5152/swagger`. El archivo `HeladeriaAPI/HeladeriaAPI.http` trae ejemplos listos para probar desde Visual Studio o VS Code.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/Categorias`, `/api/Categorias/{id}` | Consulta de categorías |
| GET | `/api/Mesas`, `/api/Mesas/{id}` | Consulta de mesas |
| GET | `/api/Productos`, `/api/Productos/{id}`, `/api/Productos/categoria/{categoriaId}` | Consulta de productos |
| GET | `/api/Pedidos`, `/api/Pedidos/{id}`, `/api/Pedidos/estado/{estado}`, `/api/Pedidos/mesa/{mesaId}`, `/api/Pedidos/{id}/detalles` | Consulta de pedidos |
| POST | `/api/Pedidos` | Crea un pedido con sus detalles |
| PUT | `/api/Pedidos/{id}/estado` | Avanza el estado del pedido |

### Reglas de negocio

- **Precio:** el cliente no envía precios. La API toma el precio de cada producto de la base de datos y calcula el total, así nadie puede alterar lo que paga.
- **Productos:** si un producto no existe la API responde `404`; si está inactivo, `400`.
- **Transacción:** el pedido y todos sus detalles se guardan juntos; si algo falla no queda nada a medias.
- **Estados:** `Pendiente` → `En Preparacion` → `Listo` → `Entregado`. Solo se puede avanzar al siguiente; retroceder o saltar un paso responde `409`.
- **Textos:** `sabores` y `toppings` admiten hasta 200 caracteres y `observaciones` hasta 300.

Ejemplo de cuerpo para `POST /api/Pedidos`:

```json
{
  "mesaId": 1,
  "detalles": [
    { "productoId": 1, "cantidad": 2, "sabores": "Chocolate", "toppings": "Maní", "observaciones": "Sin crema" }
  ]
}
```

## Frontend

Aplicación Angular en la carpeta `Frontend`. Tiene dos zonas:

- **Cliente** (`http://localhost:4200/`): elige su mesa (o entra por `/mesa/{numero}`, pensado para un código QR), arma el pedido y sigue su estado en tiempo real.
- **Personal** (`http://localhost:4200/personal`): cocina (avanza los estados), historial de pedidos, resumen, productos, categorías y mesas.

Con la API corriendo (paso 3):

```
cd Frontend
npm install
npm start
```

`npm start` redirige las llamadas a `/api` hacia `http://localhost:5152` (archivo `proxy.conf.json`), así que no hace falta configurar CORS.

Para trabajar en el frontend sin base de datos hay una API falsa con los mismos datos de ejemplo:

```
npm run mock        (en una terminal, puerto 5153)
npm run start:mock  (en otra terminal)
```

Pruebas unitarias: `npm test`.
