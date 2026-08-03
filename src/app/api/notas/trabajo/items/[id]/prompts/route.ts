import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveDeviceId } from "@/lib/notas/device";
import { DOC_VACIO, itemDelDevice, noAutorizado, noEncontrado } from "@/lib/notas/trabajo";

type Ctx = { params: Promise<{ id: string }> };

// POST: agrega un prompt al ítem. `tipo: "desbloqueo"` es el que se escribe
// desde la lista de bloqueados para reencauzar la tarea: no pisa el prompt
// original —la sesión necesita leer los dos para entender qué cambió— y devuelve
// el ítem a la cola.
export async function POST(request: NextRequest, ctx: Ctx) {
  const deviceId = await resolveDeviceId(request);
  if (!deviceId) return noAutorizado();
  const { id } = await ctx.params;
  if (!(await itemDelDevice(id, deviceId))) return noEncontrado();

  const body = await request.json().catch(() => ({}));
  const tipo = body?.tipo === "desbloqueo" ? "desbloqueo" : "inicial";
  const contenido = body?.contenido && typeof body.contenido === "object" ? body.contenido : DOC_VACIO;

  const prompt = await prisma.trabajoPrompt.create({
    data: { itemId: id, tipo, contenido },
  });

  if (tipo === "desbloqueo") {
    await prisma.trabajoItem.update({
      where: { id },
      data: {
        estado: "pendiente",
        motivoBloqueo: null,
        sesionInicio: null,
        // Los intentos se reinician: el techo de 3 existe para no quemar cuota
        // en algo trabado, y con un prompt nuevo la tarea deja de estarlo.
        intentos: 0,
        pasoActual: 0,
      },
    });
  }

  return NextResponse.json({ prompt }, { status: 201 });
}
