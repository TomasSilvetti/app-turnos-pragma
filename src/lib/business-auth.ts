import { prisma } from "@/lib/prisma";


/**
 * Resuelve el businessProfile para el usuario autenticado.
 * Funciona tanto para el admin principal (dueño) como para admins secundarios (empleados).
 * Retorna null si el usuario no pertenece a ninguna empresa.
 */
export async function resolveBusinessProfile(serviceProviderId: string): Promise<{
  id: string;
  serviceProviderId: string;
} | null> {
  // Primero buscar como dueño
  const owned = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
    select: { id: true, serviceProviderId: true },
  });
  if (owned) return owned;

  // Si no es dueño, buscar como empleado
  const empleadoEmpresa = await prisma.empleadoEmpresa.findFirst({
    where: { serviceProviderId },
    select: {
      businessProfile: { select: { id: true, serviceProviderId: true } },
    },
  });
  return empleadoEmpresa?.businessProfile ?? null;
}

/**
 * Retorna todos los serviceProviderIds de la empresa (dueño + empleados).
 */
export async function resolveAllProviderIds(businessProfileId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ serviceProviderId: string }[]>`
    SELECT "serviceProviderId" FROM empleado_empresas WHERE "businessProfileId" = ${businessProfileId}
  `;
  const bp = await prisma.businessProfile.findUnique({
    where: { id: businessProfileId },
    select: { serviceProviderId: true },
  });
  return [
    ...(bp ? [bp.serviceProviderId] : []),
    ...rows.map((r) => r.serviceProviderId),
  ];
}
