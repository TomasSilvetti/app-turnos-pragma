import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PrismaClient } from "@prisma/client";
import { verifyClientToken } from "@/lib/cliente-auth";
import LoginPageClient from "@/components/public/LoginPageClient";

const prisma = new PrismaClient();

const DEFAULT_BRAND_COLOR = "#253551";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Si ya tiene sesión activa, redirigir a la página de turnos
  const cookieStore = await cookies();
  const token = cookieStore.get("cliente-session")?.value;
  if (token) {
    const session = await verifyClientToken(token);
    if (session) {
      redirect(`/turnos/${slug}`);
    }
  }

  const business = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { name: true, brandColor: true },
  });

  if (!business) {
    notFound();
  }

  return (
    <LoginPageClient
      slug={slug}
      businessName={business.name}
      brandColor={business.brandColor ?? DEFAULT_BRAND_COLOR}
    />
  );
}
