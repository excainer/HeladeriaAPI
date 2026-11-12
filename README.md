<p align="center">
  <img src="docs/portada.svg" alt="HeladApp · HeladeriaAPI — Pide desde tu mesa, sin filas" width="100%">
</p>

# HeladeriaAPI

API REST en .NET 10 para gestionar pedidos de una heladería. Usa Dapper (Dapper.Contrib) con SQL Server y Swagger para probar los endpoints. Incluye un frontend en Angular (HeladApp) para clientes y personal.

## Equipo

Proyecto final del curso **Construcción de Software**, orientado por el profesor **Omar Andrés Cardona Zapata**. Desarrollado por:

- **Pedro Vidal**
- **Alexander Vélez**
- **Juan Silva**
- **Alejandro Ortega**
- **Juan Gallo**

El logo es una [ilustración de Cansu Sarp en Unsplash](https://unsplash.com/photos/rj4qZOnLpnw) (licencia de Unsplash, uso libre).

El repositorio original del equipo es [avelezfi/HeladeriaAPI](https://github.com/avelezfi/HeladeriaAPI). Esta copia continúa el proyecto con mejoras posteriores a la entrega (tamaños, sabores y toppings en la base de datos, administración del catálogo, login del personal y más pruebas); el historial de commits conserva el trabajo de cada integrante.

## Estructura

- `HeladeriaAPI`: proyecto Web API (Controllers, Swagger/XML, `Program.cs`).
- `HeladeriaAPI.Models`: clases de las tablas.
- `HeladeriaAPI.Query`: consultas de lectura (SELECT).
- `HeladeriaAPI.Repository`: operaciones de escritura (pedidos y catálogo).
- `BaseDeDatos/script.sql`: script para crear (o actualizar) la base de datos.
- `Frontend`: aplicación Angular (ver la sección "Frontend").
- `docs/openapi.yaml`: especificación OpenAPI de la API, exportada de Swagger.

## Requisitos

- .NET SDK 10
- SQL Server (local, Express, LocalDB o en Docker)
- Node.js 20 o superior (solo para el frontend)

## 1. Crear la base de datos

Ejecuta `BaseDeDatos/script.sql` en SQL Server Management Studio (o `sqlcmd`). Crea la base `HeladeriaAPI_DB`, sus tablas y datos de ejemplo (4 categorías, 8 productos, 5 tamaños, 3 sabores y 2 toppings, y 5 mesas). Se puede ejecutar más de una vez sin duplicar datos, y **también actualiza una base creada con una versión anterior** (agrega las tablas de tamaños y de sabores y toppings sin borrar los pedidos existentes).

Con `sqlcmd`, por ejemplo usando LocalDB (viene con Visual Studio):

```
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -i BaseDeDatos\script.sql
```

### Modelo de datos

```mermaid
erDiagram
    Categorias ||--o{ Productos : agrupa
    Categorias ||--o{ Tamanos : "ofrece"
    Categorias ||--o{ Opciones : "ofrece sabores y toppings"
    Mesas ||--o{ Pedidos : recibe
    Pedidos ||--|{ DetallesPedido : contiene
    Productos ||--o{ DetallesPedido : "se pide en"
    Tamanos |o--o{ DetallesPedido : "se elige en"
    Pedidos ||--o{ SuscripcionesPush : "avisa a"

    Categorias {
        int CategoriaId PK
        string Nombre
    }
    Productos {
        int ProductoId PK
        int CategoriaId FK
        string Nombre
        decimal Precio
        bool Activo
    }
    Tamanos {
        int TamanoId PK
        int CategoriaId FK
        string Nombre
        decimal PrecioAdicional
        int Orden
        bool Activo
    }
    Opciones {
        int OpcionId PK
        int CategoriaId FK
        string Tipo "Sabor o Topping"
        string Nombre
        int Orden
        bool Activo
    }
    Mesas {
        int MesaId PK
        int Numero
        string Estado
    }
    Pedidos {
        int PedidoId PK
        int MesaId FK
        datetime Fecha
        string Estado
        decimal Total
    }
    DetallesPedido {
        int DetallePedidoId PK
        int PedidoId FK
        int ProductoId FK
        int TamanoId FK "opcional"
        int Cantidad
        string Sabores "nombres elegidos"
        string Toppings "nombres elegidos"
        string Observaciones
        decimal PrecioUnitario
    }
    SuscripcionesPush {
        int SuscripcionPushId PK
        int PedidoId FK
        string Endpoint "servicio de push del navegador"
        string P256dh
        string Auth
        datetime Fecha
    }
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

Abre `http://localhost:5152/swagger`. Para probar los endpoints del personal desde Swagger, ejecuta primero `POST /api/Auth/login`: la cookie de sesión queda guardada en el navegador. El archivo `HeladeriaAPI/HeladeriaAPI.http` trae ejemplos listos para probar desde Visual Studio o VS Code, y la especificación completa está en [`docs/openapi.yaml`](docs/openapi.yaml).

## Acceso del personal

Los **clientes no inician sesión**: eligen su mesa, piden y siguen su pedido sin registrarse, porque la mayoría no vuelve con frecuencia. Solo los **trabajadores** entran con usuario y contraseña en `/personal`.

| Rol | Puede |
|---|---|
| **Empleado** | Cocina (avanzar pedidos), historial de pedidos, resumen y mesas |
| **Administrador** | Todo lo anterior, más editar productos, categorías, tamaños, sabores y toppings, y gestionar los usuarios |

**Usuarios iniciales** (los crea el script):

| Usuario | Nombre | Rol | Contraseña inicial |
|---|---|---|---|
| `admin` | Administrador | Administrador | `HeladApp2026` |
| `excainer` | Juan Gallo | Administrador | `12345678` |
| `alejandro` | Alejandro Ortega | Administrador | `12345678` |
| `alexander` | Alexander Vélez | Administrador | `12345678` |
| `pedro` | Pedro Vidal | Administrador | `12345678` |
| `juan` | Juan Silva | Empleado | `12345678` |

**Estas contraseñas son públicas: cámbienlas en "Mi cuenta" la primera vez que entren** y creen un usuario para cada trabajador en "Usuarios".

Seguridad:

- La sesión viaja en una cookie `HttpOnly` y `SameSite=Strict`: JavaScript no puede leerla y el navegador no la envía desde otros sitios.
- Las contraseñas se guardan cifradas con PBKDF2 (el mismo formato de ASP.NET Identity); nunca se guardan ni se devuelven en texto.
- Máximo 10 intentos de inicio de sesión por minuto desde la misma dirección.
- En cada petición se revisa que el usuario siga activo: desactivar a alguien lo saca de inmediato.
- La protección está en la API, no solo en las pantallas: sin sesión los endpoints del personal responden `401`, y sin permiso `403`.

## Endpoints

🔓 = abierto (clientes) · 🔑 = requiere sesión del personal · 🛡️ = solo administradores

| | Método | Ruta | Descripción |
|---|---|---|---|
| 🔓 | POST | `/api/Auth/login`, `/api/Auth/logout` | Iniciar y cerrar sesión |
| 🔑 | GET · PUT | `/api/Auth/yo`, `/api/Auth/clave` | Usuario actual y cambio de contraseña propia |
| 🛡️ | GET · POST · PUT | `/api/Usuarios`, `/api/Usuarios/{id}` | Usuarios del personal |
| 🔓 | GET | `/api/Categorias`, `/api/Categorias/{id}` | Consulta de categorías |
| 🛡️ | POST · PUT | `/api/Categorias`, `/api/Categorias/{id}` | Crear y renombrar categorías |
| 🔓 | GET | `/api/Productos?categoriaId=`, `/api/Productos/categoria/{categoriaId}` | Lista de productos (filtro opcional por categoría) |
| 🔓 | GET | `/api/Productos/{id}` | Detalle de un producto **con sus tamaños, sabores y toppings** |
| 🛡️ | POST · PUT | `/api/Productos`, `/api/Productos/{id}` | Crear y editar productos (precio, categoría, disponibilidad) |
| 🔓 | GET | `/api/Tamanos?categoriaId=`, `/api/Tamanos/{id}` | Consulta de tamaños |
| 🛡️ | POST · PUT | `/api/Tamanos`, `/api/Tamanos/{id}` | Crear y editar tamaños |
| 🔓 | GET | `/api/Opciones?categoriaId=&tipo=`, `/api/Opciones/{id}` | Consulta de sabores y toppings (`tipo`: `Sabor` o `Topping`) |
| 🛡️ | POST · PUT | `/api/Opciones`, `/api/Opciones/{id}` | Crear y editar sabores y toppings |
| 🔓 | GET | `/api/Mesas`, `/api/Mesas/{id}` | Consulta de mesas |
| 🔓 | GET | `/api/Mesas/numero/{numero}` | Mesa por su número visible (el del código QR) |
| 🔑 | POST | `/api/Mesas/{id}/liberar` | Liberar una mesa cuando el cliente se va |
| 🔓 | GET | `/api/Pedidos/{id}`, `/api/Pedidos/{id}/detalles` | El cliente consulta su pedido |
| 🔑 | GET | `/api/Pedidos`, `/api/Pedidos/estado/{estado}`, `/api/Pedidos/mesa/{mesaId}` | Listas de pedidos para el personal |
| 🔓 | POST | `/api/Pedidos` | Crea un pedido con sus detalles (cliente, mesa obligatoria) |
| 🔑 | POST | `/api/Pedidos/personal` | El personal registra un pedido (mesa opcional = para llevar); queda quién lo registró |
| 🔑 | PUT | `/api/Pedidos/{id}/estado` | Avanza el estado del pedido |
| 🔑 | POST | `/api/Pedidos/{id}/cancelar` | Cancela un pedido pendiente |
| 🔓 | GET | `/api/Notificaciones/clave-publica` | Clave pública VAPID para suscribirse a las notificaciones push |
| 🔓 | POST | `/api/Notificaciones/pedidos/{pedidoId}` | El celular del cliente pide aviso push cuando su pedido esté listo |

### Reglas de negocio

- **Precio:** el cliente no envía precios. La API calcula cada ítem como *precio del producto + adicional del tamaño* con los valores de la base de datos, así nadie puede alterar lo que paga.
- **Tamaños:** se definen por categoría (por ejemplo, Helados: Pequeño, Mediano, Grande). Si la categoría de un producto tiene tamaños activos, hay que elegir uno; si no tiene, el producto se pide con su precio base.
- **Sabores y toppings:** también se definen por categoría (tabla `Opciones`, con `Tipo` = `Sabor` o `Topping`) y no cambian el precio. Son opcionales; la API solo acepta los que están activos en la categoría del producto (por ejemplo, un brownie no lleva toppings) y responde `400` con las opciones válidas si no. El pedido guarda los nombres elegidos, así un pedido antiguo conserva lo que se pidió aunque luego se edite o desactive la opción. Por eso los nombres no pueden llevar comas.
- **Catálogo:** no se repiten nombres (categorías en general; productos, tamaños, sabores y toppings dentro de su categoría). Productos, tamaños, sabores y toppings no se borran: se desactivan, para conservar el histórico de pedidos.
- **Productos:** si un producto no existe la API responde `404`; si está inactivo, `400`.
- **Mesas:** una mesa queda *Ocupada* desde su primer pedido y sigue así hasta que el personal presiona **Liberar mesa** (`POST /api/Mesas/{id}/liberar`, empleados y administradores). No se puede liberar con pedidos sin entregar (`409`). La respuesta incluye `pedidosActivos` y `puedeLiberarse`.
- **Transacción:** el pedido y todos sus detalles se guardan juntos; si algo falla no queda nada a medias.
- **Estados:** `Pendiente` → `En Preparacion` → `Listo` → `Entregado`. Solo se puede avanzar al siguiente; retroceder o saltar un paso responde `409`.
- **Pedidos del personal:** empleados y administradores pueden registrar pedidos de clientes que piden en el mostrador o al mesero, para una mesa o **para llevar**. Se aplican las mismas reglas (precios del catálogo, tamaños, transacción) y queda guardado quién lo registró (`registradoPor`); los pedidos del cliente desde la mesa quedan sin ese dato.
- **Para llevar:** el cliente elige al confirmar "Para comer aquí" o "Para llevar" (`paraLlevar`); el pedido sigue asociado a su mesa y la cocina ve la etiqueta 🥡 para empacarlo. El personal también puede marcarlo, y los pedidos de mostrador (sin mesa) siempre son para llevar.
- **Cancelar:** el personal puede cancelar un pedido solo mientras está `Pendiente` (`POST /api/Pedidos/{id}/cancelar`). Un pedido cancelado no cuenta en las ventas, no ocupa la mesa y no se puede reactivar. Si dos personas cancelan y empiezan a preparar a la vez, solo una acción se aplica.
- **Notificaciones push:** en el seguimiento del pedido el cliente toca **Avisarme** y su celular recibe una notificación cuando el pedido pasa a `Listo` (o si se cancela), aunque haya cerrado la app o bloqueado la pantalla. Solo se puede pedir mientras el pedido está `Pendiente` o `En Preparacion`, hasta 5 celulares por pedido, y solo con direcciones de los servicios de push de los navegadores (Google, Mozilla, Apple, Microsoft); la API no envía nada a otros servidores. Cada pedido avisa una sola vez: después se borran sus suscripciones. Si un aviso falla, el cambio de estado se guarda igual.
- **Textos:** `sabores` y `toppings` son nombres separados por coma (ej. `"Vainilla, Fresa"`) de hasta 200 caracteres en total y `observaciones` hasta 300.

Ejemplo de cuerpo para `POST /api/Pedidos` (un helado grande y un brownie, que no maneja tamaños):

```json
{
  "mesaId": 1,
  "detalles": [
    { "productoId": 1, "tamanoId": 3, "cantidad": 2, "sabores": "Chocolate", "toppings": "Maní", "observaciones": "Sin crema" },
    { "productoId": 6, "cantidad": 1 }
  ]
}
```

## Frontend

Aplicación Angular en la carpeta `Frontend`. Tiene dos zonas:

- **Cliente** (`http://localhost:4200/`): elige su mesa (o entra por `/mesa/{numero}`, pensado para un código QR), elige tamaño, sabores y toppings, arma el pedido y sigue su estado en tiempo real. Cuando el pedido queda listo, el celular suena, vibra (Android) y muestra un aviso; con **Avisarme** también le llega una **notificación push** aunque haya cerrado la app.
- **Personal** (`http://localhost:4200/personal`, con login): **nuevo pedido** (para mostrador o mesero), cocina (avanza o cancela pedidos, y suena cuando llega uno nuevo; se puede silenciar), historial de pedidos, resumen y, para administradores, **administración** de productos, categorías, tamaños, sabores y toppings, y usuarios.

Con la API corriendo (paso 3):

```
cd Frontend
npm install
npm start
```

`npm start` redirige las llamadas a `/api` hacia `http://localhost:5152` (archivo `proxy.conf.json`), así que no hace falta configurar CORS.

Para trabajar en el frontend sin base de datos hay una API falsa con los mismos datos y reglas (mismos usuarios iniciales, más un empleado de ejemplo: `cocina` / `cocina2026`):

```
npm run mock        (en una terminal, puerto 5153)
npm run start:mock  (en otra terminal)
```

Pruebas unitarias: `npm test`.

### Notificaciones push

- **Claves:** la API firma los avisos con un par de claves VAPID. Si no están configuradas, la primera vez las genera y las guarda en `HeladeriaAPI/claves-push.json` (ignorado por git). En producción configúralas en `Notificaciones:ClavePublica`, `Notificaciones:ClavePrivada` y `Notificaciones:Asunto` (un `mailto:` o una URL de contacto), por ejemplo con variables de entorno o *user-secrets*. Si cambian, los celulares ya suscritos dejan de recibir avisos hasta que vuelvan a tocar **Avisarme**.
- **HTTPS:** los navegadores solo permiten push en `https` o en `localhost`. Para probar desde un celular en la red local (`http://192.168...`) hace falta publicar la app con https (por ejemplo, un túnel).
- **iPhone:** Safari solo ofrece push a las apps agregadas a la pantalla de inicio (iOS 16.4 o superior): **Compartir → Agregar a inicio**. La app lo explica en el seguimiento.
- **Service worker:** `Frontend/public/sw.js` solo muestra los avisos; no guarda nada en caché.
- La API falsa (`npm run mock`) acepta la suscripción pero no envía avisos.
