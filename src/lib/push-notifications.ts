import { prisma } from "@/lib/prisma";


interface NotificationPayload {
  title: string;
  body: string;
}

export async function sendPushToServiceProvider(
  serviceProviderId: string,
  payload: NotificationPayload
): Promise<void> {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return;

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { serviceProviderId },
  });

  if (subscriptions.length === 0) return;

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
        if (status === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        }
      }
    })
  );
}
