import { auth } from "@/../auth";
import { subscribeToNewBookings } from "@/lib/booking-emitter";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Enviar comentario inicial para mantener la conexión viva
      controller.enqueue(encoder.encode(": connected\n\n"));

      const unsubscribe = subscribeToNewBookings(() => {
        controller.enqueue(encoder.encode("data: new-booking\n\n"));
      });

      // Cleanup cuando el cliente desconecta
      const cleanup = () => {
        unsubscribe();
        controller.close();
      };

      // Keep-alive cada 25 segundos para evitar timeouts de proxies
      const keepAlive = setInterval(() => {
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
