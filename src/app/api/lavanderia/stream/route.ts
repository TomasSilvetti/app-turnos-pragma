import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTablero, versionTablero } from "@/lib/lavanderia/tablero";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const INTERVALO_MS = 3000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// SSE del tablero. EventSource no permite headers custom, asi que el empleado
// viaja como query param (?e=). En serverless hacemos long-polling a la DB:
// cada pocos segundos comparamos la version del tablero y, si cambio, emitimos
// el snapshot. Comentarios ": ping" mantienen viva la conexion.
export async function GET(request: NextRequest) {
  const empleadoId = request.nextUrl.searchParams.get("e");
  if (!empleadoId) return new Response("No autorizado", { status: 401 });
  const empleado = await prisma.lavEmpleado.findFirst({
    where: { id: empleadoId, activo: true },
    select: { id: true },
  });
  if (!empleado) return new Response("No autorizado", { status: 401 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let ultimaVersion = "";
      const enviar = (texto: string) => controller.enqueue(encoder.encode(texto));

      try {
        // Snapshot inicial.
        const inicial = await getTablero();
        ultimaVersion = inicial.version;
        enviar(`event: snapshot\ndata: ${JSON.stringify(inicial)}\n\n`);

        while (!request.signal.aborted) {
          await sleep(INTERVALO_MS);
          if (request.signal.aborted) break;

          const v = await versionTablero();
          if (v !== ultimaVersion) {
            const snap = await getTablero();
            ultimaVersion = snap.version;
            enviar(`event: snapshot\ndata: ${JSON.stringify(snap)}\n\n`);
          } else {
            enviar(`: ping\n\n`);
          }
        }
      } catch {
        // conexion cerrada o error de DB: terminamos el stream
      } finally {
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
