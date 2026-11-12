// API falsa SOLO para desarrollo: imita los endpoints de HeladeriaAPI con los datos de BaseDeDatos/script.sql.
// No forma parte de la aplicación ni se despliega. Uso: npm run mock (puerto 5153).
import { createServer } from 'node:http';

const categorias = [
  { categoriaId: 1, nombre: 'Helados' },
  { categoriaId: 2, nombre: 'Bebidas' },
  { categoriaId: 3, nombre: 'Postres' },
  { categoriaId: 4, nombre: 'Toppings' },
];
const mesas = [1, 2, 3, 4, 5].map((n) => ({ mesaId: n, numero: n, estado: 'Disponible' }));
const productos = [
  [1, 'Helado de Vainilla', 5000], [1, 'Helado de Chocolate', 5500], [1, 'Helado de Fresa', 5000],
  [2, 'Malteada de Chocolate', 9000], [2, 'Jugo Natural', 6000], [3, 'Brownie', 7000],
  [4, 'Chispas de Chocolate', 1500], [4, 'Maní', 1000],
].map(([categoriaId, nombre, precio], i) => ({ productoId: i + 1, categoriaId, nombre, precio, activo: true }));

const ESTADOS = ['Pendiente', 'En Preparacion', 'Listo', 'Entregado'];
let pedidos = [{ pedidoId: 1, mesaId: 1, fecha: new Date().toISOString(), estado: 'Pendiente', total: 10500 }];
let detalles = [{ detallePedidoId: 1, pedidoId: 1, productoId: 1, cantidad: 1, sabores: 'Vainilla', toppings: 'Chispas de Chocolate', observaciones: 'Sin crema', precioUnitario: 10500 }];

const enviar = (res, status, cuerpo) => {
  if (cuerpo === undefined) { res.writeHead(status); return res.end(); }
  const esTexto = typeof cuerpo === 'string';
  res.writeHead(status, { 'Content-Type': esTexto ? 'text/plain; charset=utf-8' : 'application/json' });
  res.end(esTexto ? cuerpo : JSON.stringify(cuerpo));
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname.replace(/^\/api\//i, '').split('/').filter(Boolean);
  const [recurso, a, b] = [p[0]?.toLowerCase(), p[1], p[2]];
  const lectura = (lista, id, nombre) => {
    const item = lista.find((x) => x[nombre] === Number(id));
    return item ? enviar(res, 200, item) : enviar(res, 404);
  };
  let cuerpo = '';
  req.on('data', (c) => (cuerpo += c));
  req.on('end', () => {
    if (req.method === 'GET') {
      if (recurso === 'categorias') return a ? lectura(categorias, a, 'categoriaId') : enviar(res, 200, categorias);
      if (recurso === 'mesas') return a ? lectura(mesas, a, 'mesaId') : enviar(res, 200, mesas);
      if (recurso === 'productos') {
        if (a?.toLowerCase() === 'categoria') return enviar(res, 200, productos.filter((x) => x.categoriaId === Number(b)));
        return a ? lectura(productos, a, 'productoId') : enviar(res, 200, productos);
      }
      if (recurso === 'pedidos') {
        if (!a) return enviar(res, 200, pedidos);
        if (a === 'estado') return enviar(res, 200, pedidos.filter((x) => x.estado === decodeURIComponent(b)));
        if (a === 'mesa') return enviar(res, 200, pedidos.filter((x) => x.mesaId === Number(b)));
        if (b === 'detalles') return enviar(res, 200, detalles.filter((x) => x.pedidoId === Number(a)));
        return lectura(pedidos, a, 'pedidoId');
      }
    }
    if (recurso === 'pedidos' && req.method === 'POST') {
      let datos; try { datos = JSON.parse(cuerpo); } catch { return enviar(res, 400); }
      if (!mesas.some((m) => m.mesaId === datos.mesaId)) return enviar(res, 404, `No existe la mesa ${datos.mesaId}.`);
      if (!Array.isArray(datos.detalles) || !datos.detalles.length) return enviar(res, 400, 'El pedido debe tener al menos un detalle.');
      // Igual que la API real: el precio sale del catálogo, no de lo que envía el navegador.
      const items = [];
      for (const d of datos.detalles) {
        const prod = productos.find((x) => x.productoId === d.productoId);
        if (!prod) return enviar(res, 404, `No existe el producto ${d.productoId}.`);
        if (!prod.activo) return enviar(res, 400, `El producto "${prod.nombre}" no está disponible.`);
        items.push({ ...d, precioUnitario: prod.precio });
      }
      const pedidoId = Math.max(0, ...pedidos.map((x) => x.pedidoId)) + 1;
      const total = items.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
      const pedido = { pedidoId, mesaId: datos.mesaId, fecha: new Date().toISOString(), estado: 'Pendiente', total };
      pedidos = [...pedidos, pedido];
      for (const d of items) detalles.push({ detallePedidoId: detalles.length + 1, pedidoId, sabores: null, toppings: null, observaciones: null, ...d });
      return enviar(res, 201, pedido);
    }
    if (recurso === 'pedidos' && b === 'estado' && req.method === 'PUT') {
      let estado; try { const j = JSON.parse(cuerpo); estado = typeof j === 'object' ? j.estado : j; } catch { estado = cuerpo; }
      if (!ESTADOS.includes(estado)) return enviar(res, 400, `Estado no válido. Valores permitidos: ${ESTADOS.join(', ')}.`);
      const pedido = pedidos.find((x) => x.pedidoId === Number(a));
      if (!pedido) return enviar(res, 404);
      // Igual que la API real: solo se avanza al siguiente estado.
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
