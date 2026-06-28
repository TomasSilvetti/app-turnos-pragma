import { NextRequest, NextResponse } from "next/server";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { versionTablero } from "@/lib/lavanderia/tablero";

export const dynamic = "force-dynamic";

// GET liviano: solo la version del tablero (max updatedAt + count de OTs).
// El cliente hace polling de esto cada pocos segundos y, si cambio, recien
// ahi trae el tablero completo. Reemplaza al SSE: en serverless la funcion
// vive solo lo que tarda este aggregate, en vez de mantenerse "viva" todo el
// tiempo (que es lo caro en el plan free de Vercel).
export async function GET(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const version = await versionTablero();
  return NextResponse.json({ version });
}
