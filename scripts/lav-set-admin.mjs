// Bootstrap / actualizacion de credenciales de un admin de lavanderia.
//
//   node scripts/lav-set-admin.mjs <email> <password> [nombre]
//
// - Si ya existe un LavEmpleado con ese email, le actualiza la contraseña y se
//   asegura de que sea admin activo.
// - Si no existe, crea un nuevo admin con el nombre indicado (o el local del email).
//
// Requiere que la migracion 20260625000000_lav_admin_auth ya este aplicada en la
// base (las columnas email/hashedPassword deben existir).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function validarPassword(p) {
  return /[A-Z]/.test(p) && /[^a-zA-Z0-9]/.test(p);
}

async function main() {
  const [, , emailArg, passwordArg, ...nombreArg] = process.argv;

  if (!emailArg || !passwordArg) {
    console.error("Uso: node scripts/lav-set-admin.mjs <email> <password> [nombre]");
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Email inválido.");
    process.exit(1);
  }
  if (!validarPassword(passwordArg)) {
    console.error("La contraseña debe tener al menos una mayúscula y un carácter especial.");
    process.exit(1);
  }

  const nombre = nombreArg.join(" ").trim() || email.split("@")[0];
  const hashedPassword = await bcrypt.hash(passwordArg, 12);

  const existente = await prisma.lavEmpleado.findUnique({ where: { email } });

  if (existente) {
    await prisma.lavEmpleado.update({
      where: { id: existente.id },
      data: { hashedPassword, esAdmin: true, activo: true },
    });
    console.log(`✓ Credenciales actualizadas para "${existente.nombre}" (${email}).`);
  } else {
    const creado = await prisma.lavEmpleado.create({
      data: { nombre, email, hashedPassword, esAdmin: true, activo: true },
    });
    console.log(`✓ Admin creado: "${creado.nombre}" (${email}).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
