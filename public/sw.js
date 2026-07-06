// v5 — push + caché offline para la app de notas (/notas y /api/notas).
const CACHE_SHELL = "notas-shell-v5";
const CACHE_DATA = "notas-data-v5";

// Recursos base de la app de notas para que cargue sin conexión.
const SHELL_URLS = ["/notas", "/notas/calendario", "/notas.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      // addAll falla entero si una URL no responde; las cacheamos best-effort.
      await Promise.allSettled(SHELL_URLS.map((u) => cache.add(u)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("notas-") && k !== CACHE_SHELL && k !== CACHE_DATA).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function esApiNotas(url) {
  return url.pathname.startsWith("/api/notas");
}
function esNavegacionNotas(request, url) {
  return request.mode === "navigate" && url.pathname.startsWith("/notas");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // las mutaciones las maneja el outbox del cliente
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegación a /notas: network-first, fallback a la última copia cacheada.
  if (esNavegacionNotas(request, url)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_SHELL);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_SHELL);
          return (await cache.match(request)) || (await cache.match("/notas")) || Response.error();
        }
      })()
    );
    return;
  }

  // GET a la API de notas: network-first, cacheando la última respuesta OK.
  if (esApiNotas(url)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(CACHE_DATA);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_DATA);
          const cached = await cache.match(request);
          if (cached) return cached;
          // Sin caché: responder vacío coherente para que la UI no rompa.
          return new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
    return;
  }

  // Recursos estáticos (_next, íconos): cache-first.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});

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
