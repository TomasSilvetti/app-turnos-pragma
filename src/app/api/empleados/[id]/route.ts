import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";

const prisma = new PrismaClient();

async function getBusinessProfileId(serviceProviderId: string): Promise<string | null> {
  const bp = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });
  return bp?.id ?? null;
}

// PATCH /api/empleados/:id — actualizar rol y sucursales
export const PATCH = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfileId = await getBusinessProfileId(req.auth.user.id);
  if (!businessProfileId) {
    return NextResponse.json({ error: "No tenés permiso para esta acción" }, { status: 403 });
  }

  const { id } = await context.params;

  const relacion = await prisma.empleadoEmpresa.findFirst({
    where: { serviceProviderId: id, businessProfileId },
  });

  if (!relacion) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const { rol, sucursalIds } = body;

  if (!rol || !["administrador", "empleado"].includes(rol)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const ids: string[] = Array.isArray(sucursalIds) ? sucursalIds : [];

  if (ids.length > 0) {
    const sucursales = await prisma.sucursal.findMany({
      where: { id: { in: ids }, businessProfileId },
      select: { id: true },
    });
    if (sucursales.length !== ids.length) {
      return NextResponse.json(
        { error: "Una o más sucursales no pertenecen a tu empresa" },
        { status: 400 }
      );
    }
  }

  const sp = await prisma.$transaction(async (tx) => {
    await tx.serviceProvider.update({
      where: { id },
      data: { rol },
    });

    await tx.empleadoSucursal.deleteMany({ where: { serviceProviderId: id } });

    if (ids.length > 0) {
      await tx.empleadoSucursal.createMany({
        data: ids.map((sucursalId) => ({ serviceProviderId: id, sucursalId })),
      });
    }

    return tx.serviceProvider.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, rol: true },
    });
  });

  const sucursalesAsignadas = ids.length > 0
    ? await prisma.sucursal.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];

  return NextResponse.json(
    { id: sp!.id, nombre: sp!.name, email: sp!.email, rol: sp!.rol, sucursales: sucursalesAsignadas },
    { status: 200 }
  );
});

// DELETE /api/empleados/:id — desactivar empleado (borrado lógico)
export const DELETE = auth(async (
  req: NextAuthRequest,
  context: { params: Promise<{ id: string }> }
) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfileId = await getBusinessProfileId(req.auth.user.id);
  if (!businessProfileId) {
    return NextResponse.json({ error: "No tenés permiso para esta acción" }, { status: 403 });
  }

  const { id } = await context.params;

  // No puede eliminarse a sí mismo
  if (id === req.auth.user.id) {
    return NextResponse.json({ error: "No podés eliminarte a vos mismo" }, { status: 403 });
  }

  const relacion = await prisma.empleadoEmpresa.findFirst({
    where: { serviceProviderId: id, businessProfileId },
  });

  if (!relacion) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  await prisma.serviceProvider.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "Empleado desactivado correctamente" }, { status: 200 });
});
