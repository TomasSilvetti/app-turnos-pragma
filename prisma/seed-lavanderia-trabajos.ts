import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Días laborables de los turnos (lun-vie). Coincide con LUN_A_VIE del seed base.
const DIAS_LABORABLES = new Set([1, 2, 3, 4, 5]);

function fechaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Próximos N días laborables a partir de hoy (incluye hoy si es laborable).
function proximosDiasLaborables(n: number): string[] {
  const dias: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dias.length < n) {
    if (DIAS_LABORABLES.has(d.getDay())) dias.push(fechaISO(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

type LineaSeed = { prenda: string; procesos: string[]; cantidad: number };
type OTSeed = {
  numero: string;
  cliente: string;
  telefono?: string;
  estado?: "pendiente" | "en_progreso" | "terminado";
  lineas: LineaSeed[];
};

// Plantillas de OTs por día (sumadas rozan la capacidad diaria ~600 min).
const PLAN: OTSeed[][] = [
  // Día 1
  [
    { numero: "9001", cliente: "María Gómez", telefono: "351-555-1010", estado: "terminado", lineas: [{ prenda: "Frazada / Colcha 2 plazas", procesos: ["Manchas", "Lavado", "Secado"], cantidad: 1 }] },
    { numero: "9002", cliente: "Lavadero El Sol", estado: "en_progreso", lineas: [{ prenda: "Camisa", procesos: ["Lavado", "Secado", "Planchado"], cantidad: 3 }] },
    { numero: "9003", cliente: "Juan Pérez", lineas: [{ prenda: "Saco", procesos: ["Manchas", "Lavado", "Secado", "Planchado"], cantidad: 1 }] },
  ],
  // Día 2
  [
    { numero: "9004", cliente: "Hotel Plaza", telefono: "351-555-2020", lineas: [{ prenda: "Acolchado 2 plazas", procesos: ["Lavado", "Secado"], cantidad: 1 }] },
    { numero: "9005", cliente: "Carla Ruiz", lineas: [{ prenda: "Pantalón", procesos: ["Lavado", "Secado", "Planchado"], cantidad: 3 }] },
    { numero: "9006", cliente: "Diego Sosa", lineas: [{ prenda: "Camisa", procesos: ["Lavado", "Secado", "Planchado"], cantidad: 2 }] },
  ],
  // Día 3
  [
    { numero: "9007", cliente: "Familia Andrada", lineas: [{ prenda: "Frazada / Colcha 2 plazas", procesos: ["Manchas", "Lavado", "Secado"], cantidad: 1 }] },
    { numero: "9008", cliente: "Sastrería Norte", telefono: "351-555-3030", lineas: [{ prenda: "Saco", procesos: ["Manchas", "Lavado", "Secado", "Planchado"], cantidad: 2 }] },
    { numero: "9009", cliente: "Lucía Méndez", lineas: [{ prenda: "Pantalón", procesos: ["Lavado", "Secado", "Planchado"], cantidad: 1 }] },
  ],
];

async function main() {
  const dias = proximosDiasLaborables(PLAN.length);

  // Prendas con sus duraciones por proceso, para calcular minutos.
  const prendas = await prisma.lavPrenda.findMany({ include: { duraciones: { include: { proceso: true } } } });
  const prendaPorNombre = new Map(prendas.map((p) => [p.nombre, p]));

  function minutosLinea(l: LineaSeed): { unidad: number; prendaId: string } {
    const prenda = prendaPorNombre.get(l.prenda);
    if (!prenda) throw new Error(`Prenda no encontrada en la matriz: ${l.prenda}`);
    let unidad = 0;
    for (const proc of l.procesos) {
      const dur = prenda.duraciones.find((d) => d.proceso.nombre === proc);
      if (!dur) throw new Error(`La prenda ${l.prenda} no tiene proceso ${proc} configurado`);
      unidad += dur.minutos;
    }
    return { unidad, prendaId: prenda.id };
  }

  // Empleado que "cargó" las OTs (primero no admin).
  const cargador = await prisma.lavEmpleado.findFirst({ where: { esAdmin: false }, orderBy: { createdAt: "asc" } });

  // Idempotencia: borrar OTs de ejemplo previas (numero 9001-9099).
  const numeros = PLAN.flat().map((o) => o.numero);
  await prisma.lavOT.deleteMany({ where: { numero: { in: numeros } } });

  let totalOTs = 0;
  for (let i = 0; i < PLAN.length; i++) {
    const fecha = dias[i];
    let orden = 0;
    let minutosDia = 0;
    for (const ot of PLAN[i]) {
      const items = ot.lineas.map((l) => {
        const { unidad, prendaId } = minutosLinea(l);
        return {
          descripcion: `${l.cantidad > 1 ? `${l.cantidad}× ` : ""}${l.prenda}`,
          prendaId,
          cantidad: l.cantidad,
          procesos: l.procesos,
          duracionMin: unidad * l.cantidad,
        };
      });
      const duracionMin = items.reduce((s, it) => s + it.duracionMin, 0);
      minutosDia += duracionMin;
      const estado = ot.estado ?? "pendiente";
      await prisma.lavOT.create({
        data: {
          numero: ot.numero,
          nombreCliente: ot.cliente,
          telefono: ot.telefono ?? null,
          estado,
          fechaAsignada: fecha,
          orden: orden++,
          duracionMin,
          empleadoCargaId: cargador?.id ?? null,
          empleadoTrabajoId: estado !== "pendiente" ? cargador?.id ?? null : null,
          empezadoEn: estado !== "pendiente" ? new Date() : null,
          terminadoEn: estado === "terminado" ? new Date() : null,
          items: { create: items },
        },
      });
      totalOTs++;
    }
    console.log(`  ${fecha}: ${PLAN[i].length} OTs · ${minutosDia} min (${Math.round((minutosDia / 600) * 100)}% de 10 h)`);
  }

  console.log(`Seed de trabajos completado: ${totalOTs} OTs en ${dias.length} días (${dias.join(", ")}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
