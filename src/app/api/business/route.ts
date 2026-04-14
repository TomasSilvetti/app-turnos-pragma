import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.businessProfile.findUnique({
    where: { slug: base },
  });
  if (!existing) return base;

  let suffix = 2;
  while (true) {
    const candidate = `${base}-${suffix}`;
    const conflict = await prisma.businessProfile.findUnique({
      where: { slug: candidate },
    });
    if (!conflict) return candidate;
    suffix++;
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceProviderId = session.user.id;

  const existingProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
  });
  if (existingProfile) {
    return NextResponse.json(
      { error: "El usuario ya tiene una empresa registrada" },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido" },
      { status: 400 }
    );
  }

  const { name, rubro } = body as Record<string, unknown>;

  const missingFields: string[] = [];
  if (typeof name !== "string" || name.trim() === "") missingFields.push("name");
  if (typeof rubro !== "string" || rubro.trim() === "") missingFields.push("rubro");

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "Campos obligatorios faltantes", fields: missingFields },
      { status: 400 }
    );
  }

  const slug = await uniqueSlug(generateSlug((name as string).trim()));

  const profile = await prisma.businessProfile.create({
    data: {
      name: (name as string).trim(),
      rubro: (rubro as string).trim(),
      slug,
      serviceProviderId,
    },
    select: {
      id: true,
      name: true,
      rubro: true,
      slug: true,
      serviceProviderId: true,
      createdAt: true,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
