import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ ENDPOINT DE CARGA — inserta/actualiza prendas + duraciones estimadas en prod.
// Idempotente: match de prenda por nombre (case-insensitive), upsert de duraciones.
// mins = [Manchas, Lavado, Secado, Planchado]; 0 = el proceso no aplica.
const SECRET = "6bacd58e8e611598974fa0e3f8bf1a8b4568d8053dffde4e";

const PROCESOS = ["Manchas", "Lavado", "Secado", "Planchado"] as const;

const PRENDAS: { nombre: string; mins: [number, number, number, number] }[] = [
  // Indumentaria
  { nombre: "Ambo médico", mins: [5, 25, 30, 15] },
  { nombre: "Bermuda / Short", mins: [5, 20, 25, 10] },
  { nombre: "Blusa", mins: [8, 20, 15, 20] },
  { nombre: "Boina / Gorra", mins: [5, 15, 15, 5] },
  { nombre: "Bufanda / Chalina", mins: [5, 15, 15, 10] },
  { nombre: "Buzo polar", mins: [8, 30, 40, 0] },
  { nombre: "Camisa", mins: [10, 30, 20, 25] },
  { nombre: "Camisaco", mins: [10, 30, 25, 20] },
  { nombre: "Campera", mins: [10, 35, 45, 0] },
  { nombre: "Campera de duvet", mins: [15, 45, 90, 0] },
  { nombre: "Campera de esquí", mins: [15, 45, 80, 0] },
  { nombre: "Campera de jogging", mins: [8, 30, 40, 0] },
  { nombre: "Camperón", mins: [12, 40, 60, 0] },
  { nombre: "Chaleco", mins: [8, 25, 30, 10] },
  { nombre: "Chaleco de duvet", mins: [12, 40, 70, 0] },
  { nombre: "Corbata", mins: [10, 15, 10, 15] },
  { nombre: "Corset", mins: [10, 20, 15, 15] },
  { nombre: "Delantal / Guardapolvo", mins: [8, 25, 25, 20] },
  { nombre: "Enterito de esquí", mins: [15, 45, 80, 0] },
  { nombre: "Enterito niño", mins: [8, 25, 30, 15] },
  { nombre: "Impermeable", mins: [10, 30, 40, 15] },
  { nombre: "Jean", mins: [8, 30, 40, 15] },
  { nombre: "Jumper", mins: [8, 25, 25, 20] },
  { nombre: "Mameluco / Mono", mins: [10, 30, 35, 20] },
  { nombre: "Mameluco térmico", mins: [12, 35, 45, 0] },
  { nombre: "Pantalón", mins: [10, 30, 25, 20] },
  { nombre: "Pantalón de esquí", mins: [12, 40, 70, 0] },
  { nombre: "Pantalón de jogging", mins: [8, 25, 35, 0] },
  { nombre: "Pollera", mins: [8, 20, 20, 20] },
  { nombre: "Pollera de gasa", mins: [8, 20, 15, 25] },
  { nombre: "Pollera plisada", mins: [8, 20, 20, 35] },
  { nombre: "Poncho / Ruana", mins: [10, 30, 40, 15] },
  { nombre: "Remera o chomba", mins: [5, 20, 20, 15] },
  { nombre: "Ropa infantil", mins: [5, 20, 20, 10] },
  { nombre: "Saco", mins: [15, 40, 30, 30] },
  { nombre: "Sweater", mins: [8, 30, 40, 15] },
  { nombre: "Tapado / Sobretodo / Sacón", mins: [15, 45, 50, 30] },
  { nombre: "Vestido", mins: [10, 30, 25, 30] },
  { nombre: "Vestido de 15", mins: [20, 40, 40, 90] },
  { nombre: "Vestido de calidad", mins: [15, 35, 30, 40] },
  { nombre: "Vestido de fiesta", mins: [15, 35, 30, 50] },
  { nombre: "Vestido de novia", mins: [30, 50, 50, 120] },
  // Alfombras / Peluches
  { nombre: "Alfombra mínima 4 mts", mins: [20, 90, 180, 0] },
  { nombre: "Alfombra de 4 a 6 mts", mins: [25, 120, 240, 0] },
  { nombre: "Alfombra de 6 a 8 mts", mins: [30, 150, 300, 0] },
  { nombre: "Alfombra m2 adicional", mins: [5, 20, 40, 0] },
  { nombre: "Peluche chico", mins: [10, 25, 40, 0] },
  { nombre: "Peluche mediano", mins: [12, 30, 60, 0] },
  { nombre: "Peluche grande", mins: [15, 40, 90, 0] },
  // Hogar / Ropa de cama
  { nombre: "Valet x kilo", mins: [5, 30, 40, 10] },
  { nombre: "Acolchado 1 plaza", mins: [15, 60, 90, 0] },
  { nombre: "Acolchado 2 plazas", mins: [20, 90, 120, 0] },
  { nombre: "Acolchado de duvet", mins: [20, 90, 150, 0] },
  { nombre: "Acolchado de pluma 1 plaza", mins: [20, 90, 150, 0] },
  { nombre: "Acolchado de pluma 2 plazas", mins: [25, 100, 180, 0] },
  { nombre: "Acolchado de pluma king", mins: [30, 120, 210, 0] },
  { nombre: "Acolchado king size", mins: [25, 100, 150, 0] },
  { nombre: "Bata", mins: [8, 25, 30, 15] },
  { nombre: "Bolsa de dormir", mins: [15, 50, 80, 0] },
  { nombre: "Bolsa de dormir de plumas", mins: [20, 70, 120, 0] },
  { nombre: "Cortina por paño", mins: [10, 30, 30, 30] },
  { nombre: "Frazada / Colcha 1 plaza", mins: [15, 60, 90, 0] },
  { nombre: "Frazada / Colcha 2 plazas", mins: [20, 90, 120, 0] },
  { nombre: "Funda de almohadón chica", mins: [5, 15, 20, 10] },
  { nombre: "Funda de almohadón grande", mins: [5, 20, 25, 12] },
  { nombre: "Funda de sillón chica", mins: [10, 30, 40, 20] },
  { nombre: "Funda de sillón grande", mins: [15, 45, 60, 30] },
  { nombre: "Funda sommier chica", mins: [12, 40, 50, 0] },
  { nombre: "Funda sommier grande", mins: [15, 50, 70, 0] },
  { nombre: "Mantel chico", mins: [8, 20, 20, 20] },
  { nombre: "Mantel mediano", mins: [10, 25, 25, 25] },
  { nombre: "Mantel grande", mins: [12, 30, 30, 35] },
  { nombre: "Ropa interior varia", mins: [5, 15, 15, 5] },
  { nombre: "Sábana c/u", mins: [5, 20, 25, 15] },
  { nombre: "Sábanas juego 1 o 2 plazas", mins: [8, 30, 35, 25] },
  { nombre: "Sábanas juego Queen/King", mins: [10, 40, 45, 30] },
  { nombre: "Bolso / Mochila", mins: [10, 30, 40, 0] },
  { nombre: "Servilleta", mins: [3, 10, 10, 10] },
  { nombre: "Toalla", mins: [5, 20, 30, 0] },
  { nombre: "Toallón", mins: [5, 25, 40, 0] },
  { nombre: "Valet", mins: [5, 30, 40, 10] },
  { nombre: "Zapatillas", mins: [10, 30, 60, 0] },
];

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // 1) Asegurar los 4 procesos (find-or-create por nombre).
    const procesoByNombre: Record<string, { id: string }> = {};
    for (let i = 0; i < PROCESOS.length; i++) {
      const nombre = PROCESOS[i];
      let proc = await prisma.lavProceso.findFirst({ where: { nombre } });
      if (!proc) proc = await prisma.lavProceso.create({ data: { nombre, orden: i } });
      procesoByNombre[nombre] = proc;
    }

    const maxAgg = await prisma.lavPrenda.aggregate({ _max: { orden: true } });
    let nextOrden = (maxAgg._max.orden ?? -1) + 1;

    let creadas = 0;
    let existentes = 0;
    let duracionesUpsert = 0;

    for (const p of PRENDAS) {
      let prenda = await prisma.lavPrenda.findFirst({
        where: { nombre: { equals: p.nombre, mode: "insensitive" } },
      });
      if (!prenda) {
        prenda = await prisma.lavPrenda.create({ data: { nombre: p.nombre, orden: nextOrden++ } });
        creadas++;
      } else {
        existentes++;
      }

      for (let j = 0; j < PROCESOS.length; j++) {
        const proc = procesoByNombre[PROCESOS[j]];
        const minutos = p.mins[j];
        if (minutos > 0) {
          await prisma.lavDuracion.upsert({
            where: { prendaId_procesoId: { prendaId: prenda.id, procesoId: proc.id } },
            update: { minutos },
            create: { prendaId: prenda.id, procesoId: proc.id, minutos },
          });
          duracionesUpsert++;
        } else {
          await prisma.lavDuracion.deleteMany({ where: { prendaId: prenda.id, procesoId: proc.id } });
        }
      }
    }

    const totalPrendas = await prisma.lavPrenda.count();
    return NextResponse.json({
      ok: true,
      procesos: PROCESOS.length,
      prendasCreadas: creadas,
      prendasYaExistian: existentes,
      duracionesUpsert,
      totalPrendasEnTabla: totalPrendas,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
