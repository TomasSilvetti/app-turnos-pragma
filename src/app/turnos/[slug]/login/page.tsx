import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyClientToken } from "@/lib/cliente-auth";
import LoginPageClient from "@/components/public/LoginPageClient";


const DEFAULT_BRAND_COLOR = "#253551";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ employee?: string }>;
}) {
  const { slug } = await params;
  const { employee: employeeId } = await searchParams;

  // Si ya tiene sesión activa, redirigir a la página de turnos
  const cookieStore = await cookies();
  const token = cookieStore.get("cliente-session")?.value;
  if (token) {
    const session = await verifyClientToken(token);
    if (session) {
      redirect(employeeId ? `/turnos/${slug}?employee=${employeeId}` : `/turnos/${slug}`);
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
      employeeId={employeeId ?? null}
    />
  );
}
