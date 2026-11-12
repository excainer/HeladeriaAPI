// Service worker de HeladApp: SOLO muestra las notificaciones push del pedido.
// No guarda nada en caché (la app siempre se carga del servidor).
// Recibe de la API: { titulo, mensaje, url, etiqueta }.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { mensaje: evento.data ? evento.data.text() : '' };
  }

  evento.waitUntil(
    self.registration.showNotification(datos.titulo || 'HeladApp', {
      body: datos.mensaje || '',
      icon: '/icono-192.png',
      badge: '/icono-192.png',
      // Misma etiqueta = reemplaza el aviso anterior del mismo pedido en vez de apilarse.
      tag: datos.etiqueta || 'heladapp',
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 120, 250],
      data: { url: datos.url || '/' },
    }),
  );
});

// Al tocar el aviso: si el seguimiento del pedido ya está abierto se trae al frente; si no, se abre.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || '/', self.location.origin).href;

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url === destino);
      return abierta ? abierta.focus() : self.clients.openWindow(destino);
    }),
  );
});
