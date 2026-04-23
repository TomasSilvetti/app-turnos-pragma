import { prisma } from "@/lib/prisma";


interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToCliente(
  clienteId: string,
  payload: NotificationPayload
): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[PushCliente] Faltan env vars VAPID:", { vapidPublicKey: !!vapidPublicKey, vapidPrivateKey: !!vapidPrivateKey, vapidSubject: !!vapidSubject });
    return;
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const subscriptions = await prisma.clientePushSubscription.findMany({
    where: { clienteId },
  });

  console.log(`[PushCliente] clienteId=${clienteId} suscripciones=${subscriptions.length}`);
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
        console.log(`[PushCliente] enviado OK endpoint=${sub.endpoint.slice(0, 50)}`);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        console.error("[PushCliente] Error enviando notificación:", err);
        if (status === 410 || status === 403) {
          await prisma.clientePushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}

export async function sendPushToServiceProvider(
  serviceProviderId: string,
  payload: NotificationPayload
): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[Push] Faltan env vars VAPID:", { vapidPublicKey: !!vapidPublicKey, vapidPrivateKey: !!vapidPrivateKey, vapidSubject: !!vapidSubject });
    return;
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { serviceProviderId },
  });

  console.log(`[Push] Enviando a ${subscriptions.length} suscripciones para serviceProvider ${serviceProviderId}`);
  if (subscriptions.length === 0) {
    console.warn("[Push] No hay suscripciones registradas para este serviceProvider");
    return;
  }

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        console.error("[Push] Error enviando notificación:", err);
        if (status === 410 || status === 403) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }
    })
  );
}
