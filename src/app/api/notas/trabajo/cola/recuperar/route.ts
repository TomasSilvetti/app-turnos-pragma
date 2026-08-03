import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { noAutorizado, resolveHarness } from "@/lib/notas/trabajo";

// POST: devuelve a la cola lo que quedó marcado "en_curso" sin nadie atrás, sin
// cobrarle el intento.
//
// Bajar un ítem lo toma y le suma un intento en el mismo movimiento. Si el
// runner se muere entre eso y el trabajo de verdad, el intento queda gastado sin
// que ninguna sesión haya arrancado, y a los tres el ítem se bloquea solo. Así
// se fueron 17 ítems a bloqueados el 03/08: veinticinco reinicios del runner en
// media hora, hasta dos intentos perdidos en cada uno, cero sesiones corridas.
//
// El runner lo llama al arrancar y cada vez que el puente le deja una tarea que
// no puede leer. Se puede llamar de más sin consecuencia: si no hay nada tomado
// devuelve cero.
//
// Es seguro barrer todo lo "en_curso" del device porque sólo hay un carril que
// toma ítems —el de trabajo; la itemización no pasa por acá—, así que el único
// que puede tener uno en curso es justamente quien pide recuperarlo.
export async function POST(request: NextRequest) {
  const deviceId = await resolveHarness(request);
  if (!deviceId) return noAutorizado();

  const enCurso = await prisma.trabajoItem.findMany({
    where: { deviceId, estado: "en_curso" },
    select: { id: true, titulo: true, intentos: true },
  });

  for (const item of enCurso) {
    await prisma.trabajoItem.update({
      where: { id: item.id },
      data: {
        estado: "pendiente",
        sesionInicio: null,
        intentos: Math.max(0, item.intentos - 1),
      },
    });
  }

  return NextResponse.json({
    recuperadas: enCurso.length,
    titulos: enCurso.map((i) => i.titulo),
  });
}
