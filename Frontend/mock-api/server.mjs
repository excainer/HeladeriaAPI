// API falsa SOLO para desarrollo: imita los endpoints y las reglas de HeladeriaAPI con los datos
// de BaseDeDatos/script.sql. No forma parte de la aplicación ni se despliega. Uso: npm run mock (puerto 5153).
// Los datos viven en memoria: se reinician cada vez que se levanta el servidor.
import { createServer } from 'node:http';

const categorias = ['Helados', 'Bebidas', 'Postres', 'Toppings'].map((nombre, i) => ({ categoriaId: i + 1, nombre }));
const mesas = [1, 2, 3, 4, 5].map((n) => ({ mesaId: n, numero: n, estado: 'Disponible' }));
const productos = [
  [1, 'Helado de Vainilla', 5000], [1, 'Helado de Chocolate', 5500], [1, 'Helado de Fresa', 5000],
  [2, 'Malteada de Chocolate', 9000], [2, 'Jugo Natural', 6000], [3, 'Brownie', 7000],
  [4, 'Chispas de Chocolate', 1500], [4, 'Maní', 1000],
].map(([categoriaId, nombre, precio], i) => ({ productoId: i + 1, categoriaId, nombre, precio, activo: true }));
const tamanos = [
  [1, 'Pequeño', 0, 1], [1, 'Mediano', 2000, 2], [1, 'Grande', 4000, 3],
  [2, 'Mediano', 0, 1], [2, 'Grande', 2500, 2],
].map(([categoriaId, nombre, precioAdicional, orden], i) => ({ tamanoId: i + 1, categoriaId, nombre, precioAdicional, orden, activo: true }));

const ESTADOS = ['Pendiente', 'En Preparacion', 'Listo', 'Entregado'];
const pedidos = [{ pedidoId: 1, mesaId: 1, fecha: new Date().toISOString(), estado: 'Pendiente', total: 7000 }];
const detalles = [{ detallePedidoId: 1, pedidoId: 1, productoId: 1, tamanoId: 2, cantidad: 1, sabores: 'Vainilla', toppings: 'Chispas de chocolate', observaciones: 'Sin crema', precioUnitario: 7000 }];

// Personal (solo en memoria y con claves en texto plano: es una API falsa de desarrollo).
const usuarios = [
  { usuarioId: 1, nombreUsuario: 'admin', nombre: 'Administrador', rol: 'Administrador', activo: true, clave: 'HeladApp2026' },
  { usuarioId: 2, nombreUsuario: 'cocina', nombre: 'Cocina', rol: 'Empleado', activo: true, clave: 'cocina2026' },
];
const sesiones = new Map(); // token de la cookie → usuarioId
const ROLES = ['Administrador', 'Empleado'];
const publico = ({ clave, ...u }) => u;

const enviar = (res, status, cuerpo) => {
  if (cuerpo === undefined) { res.writeHead(status); return res.end(); }
  // Igual que la API real: los mensajes de error van como texto JSON ("...").
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(cuerpo));
};

const siguienteId = (lista, campo) => Math.max(0, ...lista.map((x) => x[campo])) + 1;
const mismoNombre = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const texto = (v, max) => (typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : null);

/** Valida y guarda (crear o editar) un registro del catálogo. Devuelve [status, cuerpo]. */
function guardarCatalogo(lista, campoId, id, datos, { nombreMax, campos, mismoGrupo, etiqueta }) {
  const nombre = texto(datos.nombre, nombreMax);
  if (!nombre) return [400, 'El nombre no puede estar vacío.'];
  const existente = id === null ? null : lista.find((x) => x[campoId] === id);
  if (id !== null && !existente) return [404, undefined];
  if (datos.categoriaId !== undefined && !categorias.some((c) => c.categoriaId === datos.categoriaId)) {
    return [400, `No existe la categoría ${datos.categoriaId}.`];
  }
  const repetido = lista.some((x) => x[campoId] !== id && mismoGrupo(x, datos) && mismoNombre(x.nombre, nombre));
  if (repetido) return [409, `Ya existe ${etiqueta} llamado "${nombre}".`.replace('existe una categoría llamado', 'existe una categoría llamada')];
  const registro = { ...(existente ?? { [campoId]: siguienteId(lista, campoId) }), ...campos(datos), nombre };
  if (existente) Object.assign(existente, registro); else lista.push(registro);
  return [id === null ? 201 : 200, registro];
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/api\//i, '').split('/').filter(Boolean);
  const [recurso, a, b] = [p[0]?.toLowerCase(), p[1], p[2]];
  const filtroCategoria = url.searchParams.has('categoriaId') ? Number(url.searchParams.get('categoriaId')) : null;
  const lectura = (lista, id, campo) => {
    const item = lista.find((x) => x[campo] === Number(id));
    return item ? enviar(res, 200, item) : enviar(res, 404);
  };

  let cuerpo = '';
  req.on('data', (c) => (cuerpo += c));
  req.on('end', () => {
    let datos = {};
    if (cuerpo) { try { datos = JSON.parse(cuerpo); } catch { return enviar(res, 400, 'JSON no válido.'); } }

    // --- Sesión del personal (cookie HttpOnly, como la API real)
    const token = /(?:^|;\s*)HeladApp\.Sesion=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    const yo = usuarios.find((u) => u.usuarioId === sesiones.get(token) && u.activo) ?? null;
    const esAdmin = yo?.rol === 'Administrador';
    const sinSesion = () => enviar(res, 401);
    const sinPermiso = () => enviar(res, 403);

    if (recurso === 'auth') {
      const accion = a?.toLowerCase();
      if (accion === 'login' && req.method === 'POST') {
        const u = usuarios.find((x) => x.nombreUsuario.toLowerCase() === String(datos.nombreUsuario ?? '').trim().toLowerCase());
        if (!u || !u.activo || u.clave !== datos.clave) return enviar(res, 401, 'Usuario o contraseña incorrectos.');
        const nuevo = crypto.randomUUID();
        sesiones.set(nuevo, u.usuarioId);
        res.setHeader('Set-Cookie', `HeladApp.Sesion=${nuevo}; Path=/; HttpOnly; SameSite=Strict`);
        return enviar(res, 200, publico(u));
      }
      if (accion === 'logout' && req.method === 'POST') {
        sesiones.delete(token);
        res.setHeader('Set-Cookie', 'HeladApp.Sesion=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
        return enviar(res, 204);
      }
      if (accion === 'yo' && req.method === 'GET') return yo ? enviar(res, 200, publico(yo)) : sinSesion();
      if (accion === 'clave' && req.method === 'PUT') {
        if (!yo) return sinSesion();
        if (yo.clave !== datos.claveActual) return enviar(res, 400, 'La contraseña actual no es correcta.');
        if (String(datos.claveNueva ?? '').length < 8) return enviar(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
        yo.clave = datos.claveNueva;
        return enviar(res, 204);
      }
    }

    if (recurso === 'usuarios') {
      if (!yo) return sinSesion();
      if (!esAdmin) return sinPermiso();
      const rol = ROLES.find((r) => r.toLowerCase() === String(datos.rol ?? '').toLowerCase());
      if (req.method === 'GET' && !a) return enviar(res, 200, usuarios.map(publico));
      if (req.method === 'POST' && !a) {
        const nombreUsuario = String(datos.nombreUsuario ?? '').trim();
        if (!/^[A-Za-z0-9._-]{3,50}$/.test(nombreUsuario)) return enviar(res, 400, 'El usuario debe tener de 3 a 50 letras, números, punto, guion o guion bajo, sin espacios.');
        if (!texto(datos.nombre, 100)) return enviar(res, 400, 'El nombre no puede estar vacío.');
        if (String(datos.clave ?? '').length < 8) return enviar(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
        if (!rol) return enviar(res, 400, `Rol no válido. Valores permitidos: ${ROLES.join(', ')}.`);
        if (usuarios.some((u) => mismoNombre(u.nombreUsuario, nombreUsuario))) return enviar(res, 409, `Ya existe el usuario "${nombreUsuario}".`);
        const u = { usuarioId: siguienteId(usuarios, 'usuarioId'), nombreUsuario, nombre: datos.nombre.trim(), rol, activo: true, clave: datos.clave };
        usuarios.push(u);
        return enviar(res, 201, publico(u));
      }
      if (req.method === 'PUT' && a) {
        const u = usuarios.find((x) => x.usuarioId === Number(a));
        if (!u) return enviar(res, 404);
        if (!rol) return enviar(res, 400, `Rol no válido. Valores permitidos: ${ROLES.join(', ')}.`);
        if (u.usuarioId === yo.usuarioId && (datos.activo === false || rol !== 'Administrador')) {
          return enviar(res, 400, 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta.');
        }
        if (datos.claveNueva && datos.claveNueva.length < 8) return enviar(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
        Object.assign(u, { nombre: texto(datos.nombre, 100) ?? u.nombre, rol, activo: datos.activo !== false });
        if (datos.claveNueva) u.clave = datos.claveNueva;
        return enviar(res, 200, publico(u));
      }
    }

    // Igual que la API real: el personal necesita sesión y el catálogo solo lo edita un administrador.
    const listaDePedidos = recurso === 'pedidos' && req.method === 'GET' && (!a || a === 'estado' || a === 'mesa');
    const cambioDeEstado = recurso === 'pedidos' && req.method === 'PUT';
    const edicionCatalogo = ['categorias', 'productos', 'tamanos'].includes(recurso) && ['POST', 'PUT'].includes(req.method);
    if ((listaDePedidos || cambioDeEstado || edicionCatalogo) && !yo) return sinSesion();
    if (edicionCatalogo && !esAdmin) return sinPermiso();

    if (req.method === 'GET') {
      if (recurso === 'categorias') return a ? lectura(categorias, a, 'categoriaId') : enviar(res, 200, categorias);
      if (recurso === 'mesas') {
        if (a?.toLowerCase() === 'numero') {
          const mesa = mesas.find((m) => m.numero === Number(b));
          return mesa ? enviar(res, 200, mesa) : enviar(res, 404, `No existe la mesa número ${b}.`);
        }
        return a ? lectura(mesas, a, 'mesaId') : enviar(res, 200, mesas);
      }
      if (recurso === 'productos') {
        if (a?.toLowerCase() === 'categoria') return enviar(res, 200, productos.filter((x) => x.categoriaId === Number(b)));
        if (a) {
          const prod = productos.find((x) => x.productoId === Number(a));
          if (!prod) return enviar(res, 404);
          return enviar(res, 200, { ...prod, tamanos: tamanos.filter((t) => t.categoriaId === prod.categoriaId && t.activo) });
        }
        return enviar(res, 200, filtroCategoria === null ? productos : productos.filter((x) => x.categoriaId === filtroCategoria));
      }
      if (recurso === 'tamanos') {
        if (a) return lectura(tamanos, a, 'tamanoId');
        const lista = filtroCategoria === null ? tamanos : tamanos.filter((t) => t.categoriaId === filtroCategoria);
        return enviar(res, 200, [...lista].sort((x, y) => x.categoriaId - y.categoriaId || x.orden - y.orden));
      }
      if (recurso === 'pedidos') {
        if (!a) return enviar(res, 200, [...pedidos].reverse());
        if (a === 'estado') return enviar(res, 200, pedidos.filter((x) => x.estado === decodeURIComponent(b)));
        if (a === 'mesa') return enviar(res, 200, pedidos.filter((x) => x.mesaId === Number(b)).reverse());
        if (b === 'detalles') return enviar(res, 200, detalles.filter((x) => x.pedidoId === Number(a)));
        return lectura(pedidos, a, 'pedidoId');
      }
    }

    // --- Administración del catálogo (RF10)
    const id = a ? Number(a) : null;
    if ((req.method === 'POST' && !a) || (req.method === 'PUT' && a && !b)) {
      let r;
      if (recurso === 'categorias') {
        r = guardarCatalogo(categorias, 'categoriaId', id, datos, {
          nombreMax: 100, campos: () => ({}), mismoGrupo: () => true, etiqueta: 'una categoría',
        });
      } else if (recurso === 'productos') {
        if (!(datos.precio > 0)) return enviar(res, 400, 'El precio debe ser mayor que cero.');
        r = guardarCatalogo(productos, 'productoId', id, datos, {
          nombreMax: 100, etiqueta: 'un producto',
          campos: (d) => ({ categoriaId: d.categoriaId, precio: d.precio, activo: d.activo ?? true }),
          mismoGrupo: (x, d) => x.categoriaId === d.categoriaId,
        });
      } else if (recurso === 'tamanos') {
        if (!(datos.precioAdicional >= 0)) return enviar(res, 400, 'El precio adicional no puede ser negativo.');
        r = guardarCatalogo(tamanos, 'tamanoId', id, datos, {
          nombreMax: 50, etiqueta: 'un tamaño',
          campos: (d) => ({ categoriaId: d.categoriaId, precioAdicional: d.precioAdicional, orden: d.orden ?? 0, activo: d.activo ?? true }),
          mismoGrupo: (x, d) => x.categoriaId === d.categoriaId,
        });
      }
      if (r && recurso !== 'pedidos') return enviar(res, ...r);
    }

    // --- Pedidos: mismas reglas que la API real
    if (recurso === 'pedidos' && req.method === 'POST' && !a) {
      if (!mesas.some((m) => m.mesaId === datos.mesaId)) return enviar(res, 404, `No existe la mesa ${datos.mesaId}.`);
      if (!Array.isArray(datos.detalles) || !datos.detalles.length) return enviar(res, 400, 'El pedido debe tener al menos un detalle.');
      const items = [];
      for (const d of datos.detalles) {
        const prod = productos.find((x) => x.productoId === d.productoId);
        if (!prod) return enviar(res, 404, `No existe el producto ${d.productoId}.`);
        if (!prod.activo) return enviar(res, 400, `El producto "${prod.nombre}" no está disponible.`);
        const opciones = tamanos.filter((t) => t.categoriaId === prod.categoriaId && t.activo);
        const tamano = d.tamanoId == null ? null : opciones.find((t) => t.tamanoId === d.tamanoId);
        if (d.tamanoId != null && !tamano) return enviar(res, 400, `El tamaño ${d.tamanoId} no está disponible para "${prod.nombre}".`);
        if (d.tamanoId == null && opciones.length) {
          return enviar(res, 400, `Elige un tamaño para "${prod.nombre}": ${opciones.map((t) => `${t.nombre} (${t.tamanoId})`).join(', ')}.`);
        }
        items.push({ ...d, tamanoId: tamano?.tamanoId ?? null, precioUnitario: prod.precio + (tamano?.precioAdicional ?? 0) });
      }
      const pedidoId = siguienteId(pedidos, 'pedidoId');
      const total = items.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
      const pedido = { pedidoId, mesaId: datos.mesaId, fecha: new Date().toISOString(), estado: 'Pendiente', total };
      pedidos.push(pedido);
      for (const d of items) {
        detalles.push({ sabores: null, toppings: null, observaciones: null, ...d, detallePedidoId: siguienteId(detalles, 'detallePedidoId'), pedidoId });
      }
      return enviar(res, 201, pedido);
    }

    if (recurso === 'pedidos' && b === 'estado' && req.method === 'PUT') {
      const estado = ESTADOS.find((e) => e.toLowerCase() === String(datos.estado ?? '').toLowerCase());
      if (!estado) return enviar(res, 400, `Estado no válido. Valores permitidos: ${ESTADOS.join(', ')}.`);
      const pedido = pedidos.find((x) => x.pedidoId === Number(a));
      if (!pedido) return enviar(res, 404);
      // Solo se avanza al siguiente estado.
      const actual = ESTADOS.indexOf(pedido.estado);
      if (ESTADOS.indexOf(estado) !== actual + 1) {
        return enviar(res, 409, actual === ESTADOS.length - 1
          ? 'El pedido ya fue entregado y no se puede cambiar.'
          : `No se puede pasar de "${pedido.estado}" a "${estado}". El siguiente estado es "${ESTADOS[actual + 1]}".`);
      }
      pedido.estado = estado;
      return enviar(res, 204);
    }

    enviar(res, 404);
  });
}).listen(5153, () => console.log('API falsa de HeladApp en http://localhost:5153'));
