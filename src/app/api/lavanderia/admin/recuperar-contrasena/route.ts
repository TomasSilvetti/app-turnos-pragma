import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESPONSE = { message: "Si el email existe, te llegará un correo con las instrucciones" };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { email } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({ error: "El campo email es obligatorio" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: "El formato del email no es válido" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const empleado = await prisma.lavEmpleado.findFirst({
    where: { email: normalizedEmail, esAdmin: true, activo: true },
    select: { id: true, nombre: true },
  });

  if (!empleado) {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.lavPasswordResetToken.create({
    data: { token, empleadoId: empleado.id, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app-turnos.vercel.app";
  const resetLink = `${appUrl}/lavanderia/admin/restablecer-contrasena?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY no está configurada");
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: "Lavandería <noreply@pragmastudio.net>",
      to: normalizedEmail,
      subject: "Recuperá tu contraseña",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Recuperá tu contraseña</h1>
          <p style="color: #475569; font-size: 14px; margin-bottom: 24px;">
            Hola ${empleado.nombre}, recibimos una solicitud para restablecer la contraseña de administrador de la lavandería.
          </p>
          <a href="${resetLink}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Restablecer contraseña
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Este link expira en 1 hora. Si no solicitaste esto, podés ignorar este correo.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error al enviar correo de recuperación del admin:", error);
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
