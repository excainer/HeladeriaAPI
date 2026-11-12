# HeladApp (Frontend)

Aplicación Angular 21 de la heladería. Consume la API de `HeladeriaAPI` (ver el README principal del repositorio).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias (solo la primera vez). |
| `npm start` | Abre la app en `http://localhost:4200` usando la API real en `http://localhost:5152`. |
| `npm run mock` | Levanta una API falsa en el puerto 5153 con datos de ejemplo (no necesita base de datos). |
| `npm run start:mock` | Abre la app usando la API falsa. |
| `npm test` | Ejecuta las pruebas unitarias (Vitest). |
| `npm run build` | Genera la versión de producción en `dist/`. |

## Rutas

- `/` y `/mesa/{numero}`: el cliente elige su mesa.
- `/menu`, `/carrito`, `/pedido/{id}`: menú, pedido y seguimiento del cliente.
- `/personal`: cocina, historial de pedidos, resumen y mesas.
- `/personal/productos`, `/personal/categorias`, `/personal/tamanos`: administración del catálogo (crear, editar, activar y desactivar).

## Estructura

- `src/app/core`: modelos, servicios HTTP, interceptor de errores, guard y utilidades.
- `src/app/features`: una carpeta por pantalla.
- `src/app/shared`: componentes, pipes y utilidades reutilizables.
- `mock-api/server.mjs`: API falsa solo para desarrollo.
