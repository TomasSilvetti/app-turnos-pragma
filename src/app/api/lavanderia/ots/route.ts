import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { calcularDuracion, type ItemEntrada } from "@/lib/lavanderia/duraciones";
import { asignarOT } from "@/lib/lavanderia/capacidad";
import { getTablero } from "@/lib/lavanderia/tablero";

// GET: snapshot completo del tablero (7 dias). Requiere empleado.
export async function GET(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tablero = await getTablero();
  return NextResponse.json(tablero);
}

// POST: crea una OT (desde el preview confirmado de la carga por foto, o manual).
export async function POST(request: NextRequest) {
  const empleado = await requireEmpleado(request);
  if (!empleado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  // precioDetectado: precio de la linea leido del ticket; si viene, pisa al de la matriz.
  const items: (ItemEntrada & { precioDetectado: number | null })[] = Array.isArray(body.items)
    ? body.items
        .filter((i: unknown) => i && typeof (i as ItemEntrada).descripcion === "string")
        .map((i: ItemEntrada & { precio?: number | null }) => ({
          prendaId: i.prendaId ?? null,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad) || 1,
          precioDetectado:
            typeof i.precio === "number" && Number.isFinite(i.precio) ? Math.max(0, Math.round(i.precio)) : null,
        }))
    : [];

  if (items.length === 0)
    return NextResponse.json({ error: "La OT no tiene items" }, { status: 400 });

  const urgente = body.urgente === true;
  const fechaNecesaria =
    typeof body.fechaNecesaria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.fechaNecesaria)
      ? body.fechaNecesaria
      : null;

  const calculo = await calcularDuracion(items);
  // El monto del ticket (precio detectado) tiene prioridad sobre el de la matriz.
  const itemsConMonto = calculo.items.map((it, idx) => ({
    ...it,
    monto: items[idx]?.precioDetectado ?? it.monto,
  }));
  const { fechaAsignada, orden } = await asignarOT(calculo.duracionTotal, { urgente, fechaNecesaria });

  const ot = await prisma.lavOT.create({
    data: {
      numero: typeof body.numero === "string" ? body.numero : null,
      nombreCliente: typeof body.nombreCliente === "string" ? body.nombreCliente : null,
      telefono: typeof body.telefono === "string" ? body.telefono : null,
      domicilio: typeof body.domicilio === "string" ? body.domicilio : null,
      total: Number.isFinite(body.total) ? body.total : null,
      fechaTicket: typeof body.fechaTicket === "string" ? body.fechaTicket : null,
      estado: "pendiente",
      fechaAsignada,
      orden,
      duracionMin: calculo.duracionTotal,
      aRevisar: calculo.aRevisar,
      urgente,
      fechaNecesaria,
      empleadoCargaId: empleado.id,
      datosIA: body.datosIA ?? null,
      items: {
        create: itemsConMonto.map((it) => ({
          descripcion: it.descripcion,
          prendaId: it.prendaId,
          cantidad: it.cantidad,
          procesos: it.procesos,
          duracionMin: it.duracionMin,
          monto: it.monto,
        })),
      },
    },
    select: { id: true, fechaAsignada: true, duracionMin: true, aRevisar: true },
  });

  return NextResponse.json({ ot }, { status: 201 });
}
