import webpush from "web-push";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
}

export async function sendPushToServiceProvider(
  serviceProviderId: string,
  payload: NotificationPayload
): Promise<void> {
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
