import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmpleado } from "@/lib/lavanderia/empleado";
import { calcularDuracion, type ItemEntrada } from "@/lib/lavanderia/duraciones";
import { asignarOT, limiteDivisionMin, recompactar } from "@/lib/lavanderia/capacidad";
import { dividirEnPartes } from "@/lib/lavanderia/dividir";
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
  // esNueva: prenda "varios" renombrada por el empleado; se da de alta incompleta abajo.
  const items: (ItemEntrada & { esNueva: boolean })[] = Array.isArray(body.items)
    ? body.items
        .filter((i: unknown) => i && typeof (i as ItemEntrada).descripcion === "string")
        .map((i: ItemEntrada & { esNueva?: boolean }) => ({
          prendaId: i.prendaId ?? null,
          descripcion: i.descripcion,
          cantidad: Number(i.cantidad) || 1,
          procesoIds: Array.isArray(i.procesoIds) ? i.procesoIds.filter((x): x is string => typeof x === "string") : [],
          esNueva: i.esNueva === true,
        }))
    : [];

  if (items.length === 0)
    return NextResponse.json({ error: "La OT no tiene items" }, { status: 400 });

  // OT duplicada: si el N° ya existe y no se forzó, avisar antes de crear.
  const numeroOT = typeof body.numero === "string" ? body.numero.trim() : "";
  if (numeroOT && body.force !== true) {
    const existe = await prisma.lavOT.findFirst({ where: { numero: numeroOT }, select: { id: true } });
    if (existe)
      return NextResponse.json(
        { error: "Esta OT ya está cargada en el tablero", duplicada: true },
        { status: 409 }
      );
  }

  // Alta de prendas nuevas (caso "varios"): se crean incompletas para que el admin
  // les cargue los minutos. Se reutiliza una existente del mismo nombre si la hay.
  for (const it of items) {
    if (!it.esNueva || it.prendaId) continue;
    const nombre = it.descripcion.trim();
    if (!nombre) continue;
    const existente = await prisma.lavPrenda.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
      select: { id: true },
    });
    if (existente) {
      it.prendaId = existente.id;
    } else {
      const max = await prisma.lavPrenda.aggregate({ _max: { orden: true } });
      const prenda = await prisma.lavPrenda.create({
        data: { nombre, orden: (max._max.orden ?? -1) + 1, incompleta: true },
        select: { id: true },
      });
      it.prendaId = prenda.id;
    }
  }

  const urgente = body.urgente === true;
  const fechaNecesaria =
    typeof body.fechaNecesaria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.fechaNecesaria)
      ? body.fechaNecesaria
      : null;

  const calculo = await calcularDuracion(items);

  // Campos comunes a la OT (o a todas sus partes si se divide).
  const comun = {
    numero: typeof body.numero === "string" ? body.numero : null,
    nombreCliente: typeof body.nombreCliente === "string" ? body.nombreCliente : null,
    telefono: typeof body.telefono === "string" ? body.telefono : null,
    domicilio: typeof body.domicilio === "string" ? body.domicilio : null,
    fechaTicket: typeof body.fechaTicket === "string" ? body.fechaTicket : null,
    estado: "pendiente",
    aRevisar: calculo.aRevisar,
    urgente,
    fechaNecesaria,
    empleadoCargaId: empleado.id,
    datosIA: body.datosIA ?? null,
  };

  // Auto-division: si la OT no entra en un turno, se parte en sub-OTs que si entren.
  const turnos = await prisma.lavTurnoConfig.findMany();
  const limite = limiteDivisionMin(turnos as Parameters<typeof limiteDivisionMin>[0]);
  const partes =
    calculo.duracionTotal > limite ? dividirEnPartes(calculo.items, limite) : [];

  // Caso normal (no se divide): una sola OT, como siempre.
  if (partes.length <= 1) {
    const { fechaAsignada, orden } = await asignarOT(calculo.duracionTotal, { urgente, fechaNecesaria });
    const ot = await prisma.lavOT.create({
      data: {
        ...comun,
        fechaAsignada,
        orden,
        duracionMin: calculo.duracionTotal,
        items: {
          create: calculo.items.map((it) => ({
            descripcion: it.descripcion,
            prendaId: it.prendaId,
            cantidad: it.cantidad,
            procesoIds: it.procesoIds,
            duracionMin: it.duracionMin,
          })),
        },
      },
      select: { id: true, fechaAsignada: true, duracionMin: true, aRevisar: true },
    });
    // Reacomoda toda la cola rellenando huecos con las OTs que entren (gap-filling).
    await recompactar();
    return NextResponse.json({ ot }, { status: 201 });
  }

  // OT dividida: se crean N sub-OTs que comparten grupoId y numero. Se asigna cada
  // parte en secuencia para que su ocupacion cuente al asignar la siguiente (asi el
  // packer las reparte, ~2 por dia).
  const grupoId = crypto.randomUUID();
  const total = partes.length;
  const creadas: { id: string; fechaAsignada: string }[] = [];
  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    const { fechaAsignada, orden } = await asignarOT(parte.duracionMin, { urgente, fechaNecesaria });
    const ot = await prisma.lavOT.create({
      data: {
        ...comun,
        fechaAsignada,
        orden,
        duracionMin: parte.duracionMin,
        grupoId,
        parteIndice: i + 1,
        parteTotal: total,
        items: {
          create: parte.items.map((it) => ({
            descripcion: it.descripcion,
            prendaId: it.prendaId,
            cantidad: it.cantidad,
            procesoIds: it.procesoIds,
            duracionMin: it.duracionMin,
          })),
        },
      },
      select: { id: true, fechaAsignada: true },
    });
    creadas.push(ot);
  }

  // Reacomoda toda la cola rellenando huecos con las OTs que entren (gap-filling).
  await recompactar();

  return NextResponse.json({ grupoId, partes: total, ots: creadas }, { status: 201 });
}
