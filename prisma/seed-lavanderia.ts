import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Días que atiende (single-tenant): domingo cerrado, lun-sáb abierto.
  const dias = [
    { diaSemana: 0, atiende: false },
    { diaSemana: 1, atiende: true },
    { diaSemana: 2, atiende: true },
    { diaSemana: 3, atiende: true },
    { diaSemana: 4, atiende: true },
    { diaSemana: 5, atiende: true },
    { diaSemana: 6, atiende: true },
  ];
  for (const d of dias) {
    await prisma.lavDiaConfig.upsert({ where: { diaSemana: d.diaSemana }, update: d, create: d });
  }

  // Turnos por día. Lun-vie: mañana 08-14, tarde 17-21, especial 14-17.
  // Sábado: solo mañana 10-14.
  const turnos = [
    ...[1, 2, 3, 4, 5].flatMap((diaSemana) => [
      { diaSemana, tipo: "manana", horaInicio: "08:00", horaFin: "14:00", habilitado: true },
      { diaSemana, tipo: "tarde", horaInicio: "17:00", horaFin: "21:00", habilitado: true },
      { diaSemana, tipo: "extra", horaInicio: "14:00", horaFin: "17:00", habilitado: true },
    ]),
    { diaSemana: 6, tipo: "manana", horaInicio: "10:00", horaFin: "14:00", habilitado: true },
  ];
  for (const t of turnos) {
    await prisma.lavTurnoConfig.upsert({
      where: { diaSemana_tipo: { diaSemana: t.diaSemana, tipo: t.tipo } },
      update: t,
      create: t,
    });
  }

  // Empleado admin inicial (solo si no hay empleados).
  const totalEmpleados = await prisma.lavEmpleado.count();
  if (totalEmpleados === 0) {
    await prisma.lavEmpleado.createMany({
      data: [
        { nombre: "Administrador", esAdmin: true },
        { nombre: "Leila", esAdmin: false },
        { nombre: "Miriam", esAdmin: false },
      ],
    });
  }

  // Matriz prendas x procesos (solo si no hay procesos).
  const totalProcesos = await prisma.lavProceso.count();
  if (totalProcesos === 0) {
    const procesosBase = ["Manchas", "Lavado", "Secado", "Planchado"];
    const procesos = [];
    for (let i = 0; i < procesosBase.length; i++) {
      procesos.push(await prisma.lavProceso.create({ data: { nombre: procesosBase[i], orden: i } }));
    }

    // Prendas de ejemplo (incluye las de la comanda de referencia).
    const prendasBase: { nombre: string; mins: [number, number, number, number] }[] = [
      { nombre: "Frazada / Colcha 2 plazas", mins: [20, 90, 120, 0] },
      { nombre: "Acolchado 2 plazas", mins: [20, 90, 120, 0] },
      { nombre: "Camisa", mins: [10, 30, 20, 25] },
      { nombre: "Pantalón", mins: [10, 30, 25, 20] },
      { nombre: "Saco", mins: [15, 40, 30, 30] },
    ];
    for (let i = 0; i < prendasBase.length; i++) {
      const p = prendasBase[i];
      const prenda = await prisma.lavPrenda.create({ data: { nombre: p.nombre, orden: i } });
      for (let j = 0; j < procesos.length; j++) {
        if (p.mins[j] > 0) {
          await prisma.lavDuracion.create({
            data: { prendaId: prenda.id, procesoId: procesos[j].id, minutos: p.mins[j] },
          });
        }
      }
    }
  }

  console.log("Seed de lavandería completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
