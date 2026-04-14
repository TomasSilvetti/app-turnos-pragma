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
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/dashboard/turnos-reservados"));
});
