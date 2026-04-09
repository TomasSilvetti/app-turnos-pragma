import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
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
      { error: "El prestador ya tiene un perfil creado" },
      { status: 409 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la petición inválido" },
      { status: 400 }
    );
  }

  const name = formData.get("name");
  const address = formData.get("address");
  const phone = formData.get("phone");
  const cbu = formData.get("cbu");
  const alias = formData.get("alias");
  const logo = formData.get("logo");

  const missingFields: string[] = [];
  if (!name || typeof name !== "string" || name.trim() === "") missingFields.push("name");
  if (!address || typeof address !== "string" || address.trim() === "") missingFields.push("address");
  if (!phone || typeof phone !== "string" || phone.trim() === "") missingFields.push("phone");
  if (!cbu || typeof cbu !== "string" || cbu.trim() === "") missingFields.push("cbu");
  if (!alias || typeof alias !== "string" || alias.trim() === "") missingFields.push("alias");
  if (!logo || !(logo instanceof File)) missingFields.push("logo");

  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "Campos obligatorios faltantes", fields: missingFields },
      { status: 400 }
    );
  }

  const logoFile = logo as File;
  const ext = path.extname(logoFile.name) || ".png";
  const filename = `${serviceProviderId}-${Date.now()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "logos");
  const filePath = path.join(uploadDir, filename);

  const buffer = Buffer.from(await logoFile.arrayBuffer());
  await writeFile(filePath, buffer);

  const logoUrl = `/uploads/logos/${filename}`;

  const slug = await uniqueSlug(generateSlug((name as string).trim()));

  const profile = await prisma.businessProfile.create({
    data: {
      name: (name as string).trim(),
      address: (address as string).trim(),
      phone: (phone as string).trim(),
      cbu: (cbu as string).trim(),
      alias: (alias as string).trim(),
      logoUrl,
      slug,
      serviceProviderId,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}
