import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/../auth";
import type { NextAuthRequest } from "next-auth";
import bcrypt from "bcryptjs";


async function getBusinessProfileId(serviceProviderId: string): Promise<string | null> {
  const bp = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true },
  });
  return bp?.id ?? null;
}

// GET /api/empleados — lista empleados activos de la empresa
export const GET = auth(async (req: NextAuthRequest) => {
  const userId = req.auth?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfileId = await getBusinessProfileId(userId);
  if (!businessProfileId) {
    return NextResponse.json({ error: "No tenés permiso para esta acción" }, { status: 403 });
  }

  const [propietario, relaciones] = await Promise.all([
    prisma.serviceProvider.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        rol: true,
        isActive: true,
        sucursales: {
          select: {
            sucursal: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.empleadoEmpresa.findMany({
      where: { businessProfileId },
      select: {
        serviceProvider: {
          select: {
            id: true,
            name: true,
            email: true,
            rol: true,
            isActive: true,
            sucursales: {
              select: {
                sucursal: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const empleadosBase = relaciones
    .filter((r) => r.serviceProvider.isActive)
    .map((r) => ({
      id: r.serviceProvider.id,
      nombre: r.serviceProvider.name,
      email: r.serviceProvider.email,
      rol: r.serviceProvider.rol,
      sucursales: r.serviceProvider.sucursales.map((s) => s.sucursal),
    }));

  // Incluir al propietario si está activo y no está ya en la lista
  const yaIncluido = empleadosBase.some((e) => e.id === userId);
  if (propietario && propietario.isActive && !yaIncluido) {
    empleadosBase.unshift({
      id: propietario.id,
      nombre: propietario.name,
      email: propietario.email,
      rol: propietario.rol,
      sucursales: propietario.sucursales.map((s) => s.sucursal),
    });
  }

  return NextResponse.json(empleadosBase, { status: 200 });
});

// POST /api/empleados — crear nuevo empleado
export const POST = auth(async (req: NextAuthRequest) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessProfileId = await getBusinessProfileId(req.auth.user.id);
  if (!businessProfileId) {
    return NextResponse.json({ error: "No tenés permiso para esta acción" }, { status: 403 });
  }

  const body = await req.json();
  const { nombre, email, password, rol, sucursalIds } = body;

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json(
      { error: "Los campos nombre, email, contraseña y rol son obligatorios" },
      { status: 400 }
    );
  }

  if (!["administrador", "empleado"].includes(rol)) {
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

  const existing = await prisma.serviceProvider.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Este email ya está en uso" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const serviceProvider = await prisma.$transaction(async (tx) => {
    const sp = await tx.serviceProvider.create({
      data: { name: nombre, email, hashedPassword, rol },
    });

    await tx.empleadoEmpresa.create({
      data: { serviceProviderId: sp.id, businessProfileId },
    });

    if (ids.length > 0) {
      await tx.empleadoSucursal.createMany({
        data: ids.map((sucursalId) => ({ serviceProviderId: sp.id, sucursalId })),
      });
    }

    return sp;
  });

  const sucursalesAsignadas = ids.length > 0
    ? await prisma.sucursal.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];

  return NextResponse.json(
    {
      id: serviceProvider.id,
      nombre: serviceProvider.name,
      email: serviceProvider.email,
      rol: serviceProvider.rol,
      sucursales: sucursalesAsignadas,
    },
    { status: 201 }
  );
});
