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

  const { email, slug } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.trim() === "") {
    return NextResponse.json({ error: "El campo email es obligatorio" }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json({ error: "El formato del email no es válido" }, { status: 400 });
  }
  if (typeof slug !== "string" || slug.trim() === "") {
    return NextResponse.json({ error: "El campo slug es obligatorio" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const cliente = await prisma.cliente.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, nombre: true },
  });

  if (!cliente) {
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.clientePasswordResetToken.create({
    data: { token, clienteId: cliente.id, expiresAt },
  });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  const resetLink = `${appUrl}/turnos/${slug.trim()}/restablecer-contrasena?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error("RESEND_API_KEY no está configurada");
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  }

  const resend = new Resend(resendKey);

  try {
    await resend.emails.send({
      from: "Turnos App <noreply@pragmastudio.net>",
      to: normalizedEmail,
      subject: "Recuperá tu contraseña",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="width: 40px; height: 40px; background: #253551; border-radius: 12px; text-align: center; vertical-align: middle;">
                  <span style="color: white; font-weight: bold; font-size: 18px; line-height: 40px;">T</span>
                </td>
              </tr>
            </table>
          </div>
          <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 8px;">Recuperá tu contraseña</h1>
          <p style="color: #475569; font-size: 14px; margin-bottom: 24px;">
            Hola ${cliente.nombre}, recibimos una solicitud para restablecer la contraseña de tu cuenta.
          </p>
          <a href="${resetLink}" style="display: inline-block; background: #253551; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">
            Restablecer contraseña
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Este link expira en 1 hora. Si no solicitaste esto, podés ignorar este correo.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error al enviar correo de recuperación de cliente:", error);
  }

  return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
}
