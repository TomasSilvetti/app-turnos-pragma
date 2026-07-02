import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";
import { fechaARDe, hoyAR } from "@/lib/lavanderia/fecha";

export type ConsumoDia = {
  fecha: string; // yyyy-MM-dd (AR)
  costoUsd: number;
  requests: number;
};

export type ConsumoRegistro = {
  id: string;
  creadoEn: string; // ISO
  modelo: string;
  contexto: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheCreacionTokens: number;
  cacheLecturaTokens: number;
  costoUsd: number;
};

export type ConsumoIAResumen = {
  mes: { costoUsd: number; requests: number; tokens: number };
  total: { costoUsd: number; requests: number };
  porDia: ConsumoDia[]; // últimos 30 días
  recientes: ConsumoRegistro[]; // últimos 20
};

// GET: consumo de la API de Claude. Solo admin.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const hoy = hoyAR();
  const inicioMes = new Date(`${hoy.slice(0, 7)}-01T00:00:00-03:00`);
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalAgg, mesAgg, filas30, recientes] = await Promise.all([
    prisma.lavIAUso.aggregate({ _sum: { costoUsd: true }, _count: true }),
    prisma.lavIAUso.aggregate({
      where: { creadoEn: { gte: inicioMes } },
      _sum: { costoUsd: true, inputTokens: true, outputTokens: true, cacheCreacionTokens: true, cacheLecturaTokens: true },
      _count: true,
    }),
    prisma.lavIAUso.findMany({
      where: { creadoEn: { gte: hace30 } },
      select: { creadoEn: true, costoUsd: true },
    }),
    prisma.lavIAUso.findMany({
      orderBy: { creadoEn: "desc" },
      take: 20,
    }),
  ]);

  // Agrupar por día (AR) para el gráfico.
  const porDiaMap = new Map<string, { costoUsd: number; requests: number }>();
  for (const f of filas30) {
    const fecha = fechaARDe(f.creadoEn);
    const acc = porDiaMap.get(fecha) ?? { costoUsd: 0, requests: 0 };
    acc.costoUsd += Number(f.costoUsd);
    acc.requests += 1;
    porDiaMap.set(fecha, acc);
  }
  const porDia: ConsumoDia[] = [...porDiaMap.entries()]
    .map(([fecha, v]) => ({ fecha, costoUsd: v.costoUsd, requests: v.requests }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const mesTokens =
    (mesAgg._sum.inputTokens ?? 0) +
    (mesAgg._sum.outputTokens ?? 0) +
    (mesAgg._sum.cacheCreacionTokens ?? 0) +
    (mesAgg._sum.cacheLecturaTokens ?? 0);

  const resumen: ConsumoIAResumen = {
    mes: {
      costoUsd: Number(mesAgg._sum.costoUsd ?? 0),
      requests: mesAgg._count,
      tokens: mesTokens,
    },
    total: {
      costoUsd: Number(totalAgg._sum.costoUsd ?? 0),
      requests: totalAgg._count,
    },
    porDia,
    recientes: recientes.map((r) => ({
      id: r.id,
      creadoEn: r.creadoEn.toISOString(),
      modelo: r.modelo,
      contexto: r.contexto,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      cacheCreacionTokens: r.cacheCreacionTokens,
      cacheLecturaTokens: r.cacheLecturaTokens,
      costoUsd: Number(r.costoUsd),
    })),
  };

  return NextResponse.json(resumen);
}
