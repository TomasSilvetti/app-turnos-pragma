import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/lavanderia/empleado";

// Config de horarios por día de la semana (single-tenant). 0=Domingo .. 6=Sabado.
const TIPOS = ["manana", "tarde", "extra"] as const;
type Tipo = (typeof TIPOS)[number];

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:mm" 24hs

type TurnoDTO = { horaInicio: string; horaFin: string; habilitado: boolean };
type DiaDTO = { diaSemana: number; atiende: boolean; turnos: Record<Tipo, TurnoDTO> };

const DEFAULTS: Record<Tipo, TurnoDTO> = {
  manana: { horaInicio: "08:00", horaFin: "14:00", habilitado: false },
  tarde: { horaInicio: "17:00", horaFin: "21:00", habilitado: false },
  extra: { horaInicio: "14:00", horaFin: "17:00", habilitado: false },
};

// GET: config normalizada de los 7 días con sus 3 turnos (rellena defaults). Solo admin.
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const [turnos, diasConfig] = await Promise.all([
    prisma.lavTurnoConfig.findMany(),
    prisma.lavDiaConfig.findMany(),
  ]);
  const atiende = new Set(diasConfig.filter((d) => d.atiende).map((d) => d.diaSemana));
  const porDiaTipo = new Map(turnos.map((t) => [`${t.diaSemana}:${t.tipo}`, t]));

  const dias: DiaDTO[] = [];
  for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
    const t = Object.fromEntries(
      TIPOS.map((tipo) => {
        const row = porDiaTipo.get(`${diaSemana}:${tipo}`);
        return [
          tipo,
          row
            ? { horaInicio: row.horaInicio, horaFin: row.horaFin, habilitado: row.habilitado }
            : { ...DEFAULTS[tipo] },
        ];
      })
    ) as Record<Tipo, TurnoDTO>;
    dias.push({ diaSemana, atiende: atiende.has(diaSemana), turnos: t });
  }

  return NextResponse.json({ dias });
}

// PUT: guarda la config completa (7 días × 3 turnos + atiende por día). Solo admin.
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const dias = Array.isArray(body.dias) ? (body.dias as DiaDTO[]) : null;
  if (!dias) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  // Validación: horarios "HH:mm" y apertura < cierre en los turnos habilitados.
  for (const d of dias) {
    if (typeof d.diaSemana !== "number" || d.diaSemana < 0 || d.diaSemana > 6)
      return NextResponse.json({ error: "Día inválido" }, { status: 400 });
    for (const tipo of TIPOS) {
      const t = d.turnos?.[tipo];
      if (!t || !t.habilitado) continue;
      if (!HORA_REGEX.test(t.horaInicio) || !HORA_REGEX.test(t.horaFin))
        return NextResponse.json({ error: "Horario inválido (usá formato HH:mm 24hs)" }, { status: 400 });
      if (t.horaInicio >= t.horaFin)
        return NextResponse.json(
          { error: "La hora de apertura debe ser anterior a la de cierre" },
          { status: 400 }
        );
    }
  }

  await prisma.$transaction([
    ...dias.map((d) =>
      prisma.lavDiaConfig.upsert({
        where: { diaSemana: d.diaSemana },
        update: { atiende: Boolean(d.atiende) },
        create: { diaSemana: d.diaSemana, atiende: Boolean(d.atiende) },
      })
    ),
    ...dias.flatMap((d) =>
      TIPOS.map((tipo) => {
        const t = d.turnos?.[tipo] ?? DEFAULTS[tipo];
        const data = {
          horaInicio: t.horaInicio,
          horaFin: t.horaFin,
          habilitado: Boolean(t.habilitado),
        };
        return prisma.lavTurnoConfig.upsert({
          where: { diaSemana_tipo: { diaSemana: d.diaSemana, tipo } },
          update: data,
          create: { diaSemana: d.diaSemana, tipo, ...data },
        });
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
