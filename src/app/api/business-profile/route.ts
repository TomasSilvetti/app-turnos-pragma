import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/../auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId: session.user.id },
    select: {
      name: true,
      logoUrl: true,
      address: true,
      phone: true,
      cbu: true,
      alias: true,
      slug: true,
      brandColor: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const serviceProviderId = session.user.id;

  const existingProfile = await prisma.businessProfile.findUnique({
    where: { serviceProviderId },
  });
  if (!existingProfile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { name, address, phone, cbu, alias, logo } = body as Record<string, string | undefined>;

  const missingFields: string[] = [];
  if (!name?.trim()) missingFields.push("name");
  if (!address?.trim()) missingFields.push("address");
  if (!phone?.trim()) missingFields.push("phone");
  if (!cbu?.trim()) missingFields.push("cbu");
  if (!alias?.trim()) missingFields.push("alias");

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "Campos obligatorios faltantes", fields: missingFields },
      { status: 400 }
    );
  }

  const logoUrl = logo ?? existingProfile.logoUrl;

  const updated = await prisma.businessProfile.update({
    where: { serviceProviderId },
    data: {
      name: name!.trim(),
      address: address!.trim(),
      phone: phone!.trim(),
      cbu: cbu!.trim(),
      alias: alias!.trim(),
      logoUrl,
    },
    select: {
      name: true,
      logoUrl: true,
      address: true,
      phone: true,
      cbu: true,
      alias: true,
      slug: true,
    },
  });

  return NextResponse.json(updated);
}

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
      { error: "El prestador ya tiene un perfil creado" },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido" }, { status: 400 });
  }

  const { name, address, phone, cbu, alias, logo, rubro } = body as Record<string, string | undefined>;

  const missingFields: string[] = [];
  if (!name?.trim()) missingFields.push("name");
  if (!address?.trim()) missingFields.push("address");
  if (!phone?.trim()) missingFields.push("phone");
  if (!cbu?.trim()) missingFields.push("cbu");
  if (!alias?.trim()) missingFields.push("alias");
  if (!logo) missingFields.push("logo");
  if (!rubro?.trim()) missingFields.push("rubro");

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "Campos obligatorios faltantes", fields: missingFields },
      { status: 400 }
    );
  }

  const slug = await uniqueSlug(generateSlug(name!.trim()));

  const profile = await prisma.businessProfile.create({
    data: {
      name: name!.trim(),
      address: address!.trim(),
      phone: phone!.trim(),
      cbu: cbu!.trim(),
      alias: alias!.trim(),
      logoUrl: logo!,
      slug,
      rubro: rubro!.trim(),
      serviceProviderId,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
