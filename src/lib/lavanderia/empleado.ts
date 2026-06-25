import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// La app de lavanderia no tiene login: cada navegador guarda el empleadoId
// activo en localStorage y lo envia en el header `x-empleado-id`. Aca se valida
// contra la DB. Espejo de `notas/device.ts`.

export type EmpleadoSesion = { id: string; nombre: string; esAdmin: boolean };

export async function resolveEmpleado(request: NextRequest): Promise<EmpleadoSesion | null> {
  const empleadoId = request.headers.get("x-empleado-id");
  if (!empleadoId) return null;
  const empleado = await prisma.lavEmpleado.findFirst({
    where: { id: empleadoId, activo: true },
    select: { id: true, nombre: true, esAdmin: true },
  });
  return empleado ?? null;
}

// Devuelve el empleado o null. Usar cuando la accion requiere identidad.
export async function requireEmpleado(request: NextRequest): Promise<EmpleadoSesion | null> {
  return resolveEmpleado(request);
}

// Devuelve el empleado solo si es admin, null en caso contrario.
export async function requireAdmin(request: NextRequest): Promise<EmpleadoSesion | null> {
  const empleado = await resolveEmpleado(request);
  return empleado?.esAdmin ? empleado : null;
}
