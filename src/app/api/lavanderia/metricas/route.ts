import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

export type MetricaEmpleado = {
  empleadoId: string;
  nombre: string;
  trabajadas: number; // OTs que empezó/trabajó
  terminadas: number;
  minutosTrabajados: number; // suma de duración de las terminadas
  tiempoPromedioMin: number; // promedio real empezar→terminar
};

// GET: métricas agregadas por empleado. Solo admin.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [empleados, ots] = await Promise.all([
    prisma.lavEmpleado.findMany({ select: { id: true, nombre: true } }),
    prisma.lavOT.findMany({
      where: { empleadoTrabajoId: { not: null } },
      select: { empleadoTrabajoId: true, estado: true, duracionMin: true, empezadoEn: true, terminadoEn: true },
    }),
  ]);

  const nombre = new Map(empleados.map((e) => [e.id, e.nombre]));
  const acc = new Map<
    string,
    { trabajadas: number; terminadas: number; minutos: number; sumaReal: number; conTiempo: number }
  >();

  for (const ot of ots) {
    const id = ot.empleadoTrabajoId!;
    const a = acc.get(id) ?? { trabajadas: 0, terminadas: 0, minutos: 0, sumaReal: 0, conTiempo: 0 };
    a.trabajadas += 1;
    if (ot.estado === "terminado") {
      a.terminadas += 1;
      a.minutos += ot.duracionMin;
      if (ot.empezadoEn && ot.terminadoEn) {
        a.sumaReal += (ot.terminadoEn.getTime() - ot.empezadoEn.getTime()) / 60000;
        a.conTiempo += 1;
      }
    }
    acc.set(id, a);
  }

  const metricas: MetricaEmpleado[] = [...acc.entries()].map(([id, a]) => ({
    empleadoId: id,
    nombre: nombre.get(id) ?? "—",
    trabajadas: a.trabajadas,
    terminadas: a.terminadas,
    minutosTrabajados: a.minutos,
    tiempoPromedioMin: a.conTiempo > 0 ? Math.round(a.sumaReal / a.conTiempo) : 0,
  }));

  metricas.sort((x, y) => y.terminadas - x.terminadas);
  return NextResponse.json({ metricas });
}
