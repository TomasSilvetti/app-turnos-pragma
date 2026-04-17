import { auth } from "@/../auth";
import { subscribeToNewBookings } from "@/lib/booking-emitter";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Enviar comentario inicial para mantener la conexión viva
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribeToNewBookings(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode("data: new-booking\n\n"));
        } catch {
          // El controller se cerró entre la verificación y el enqueue
        }
      });

      // Cleanup cuando el cliente desconecta
      const cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ya estaba cerrado
        }
      };

      // Keep-alive cada 25 segundos para evitar timeouts de proxies
      const keepAlive = setInterval(() => {
        if (closed) {
          clearInterval(keepAlive);
          return;
        }
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 25_000);

      // Asociar cleanup al cierre del stream
      (controller as unknown as { _cleanup?: () => void })._cleanup = () => {
        clearInterval(keepAlive);
        cleanup();
      };
    },
    cancel(controller) {
      closed = true;
      const ctrl = controller as unknown as { _cleanup?: () => void };
      ctrl._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
