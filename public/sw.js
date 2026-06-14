// v4
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Nuevo turno", body: event.data.text() };
  }

  const title = payload.title ?? "Nuevo turno";
  const options = {
    body: payload.body ?? "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url ?? "/" },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: payload.tag ?? "turno",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      // Si ya hay una pestaña abierta, enfocarla y navegar al destino exacto.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch {
              // navigate puede fallar en cross-origin; abrir ventana nueva como fallback.
              return clients.openWindow(url);
            }
          }
          return;
        }
      }
      return clients.openWindow(url);
    })()
  );
});
