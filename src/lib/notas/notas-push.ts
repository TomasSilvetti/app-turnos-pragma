import { prisma } from "@/lib/prisma";

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Envía push a todas las suscripciones de un device anónimo.
// Reutiliza el mismo stack web-push + VAPID de la app principal.
export async function sendPushToDevice(
  deviceId: string,
  payload: NotificationPayload
): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error("[NotasPush] Faltan env vars VAPID");
    return;
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const subscriptions = await prisma.notaPushSubscription.findMany({ where: { deviceId } });
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr,
          { TTL: 86400, urgency: "high" }
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 403) {
          await prisma.notaPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}
