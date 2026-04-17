import { MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import BookingSection from "@/components/public/BookingSection";
import { prisma } from "@/lib/prisma";
import { verifyClientToken } from "@/lib/cliente-auth";


const DEFAULT_BRAND_COLOR = "#253551";

type BusinessPublicData = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  cbu: string | null;
  alias: string | null;
  brandColor: string;
  sucursales: { id: string; name: string; address: string }[];
};

async function getBusinessBySlug(
  slug: string
): Promise<BusinessPublicData | null> {
  const profile = await prisma.businessProfile.findUnique({
    where: { slug },
    select: {
      name: true,
      logoUrl: true,
      address: true,
      phone: true,
      cbu: true,
      alias: true,
      brandColor: true,
      sucursales: {
        select: {
          id: true,
          name: true,
          address: true,
          empleados: { select: { id: true }, take: 1 },
        },
      },
    },
  });
  if (!profile) return null;
  const sucursales = profile.sucursales
    .filter((s) => s.empleados.length > 0)
    .map((s) => ({ id: s.id, name: s.name, address: s.address }));
  return { ...profile, brandColor: profile.brandColor ?? DEFAULT_BRAND_COLOR, sucursales };
}

export default async function PublicBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ employee?: string }>;
}) {
  const { slug } = await params;
  const { employee: initialEmployeeId } = await searchParams;
  const business = await getBusinessBySlug(slug);

  // Leer sesión del cliente para el flujo autenticado
  const cookieStore = await cookies();
  const token = cookieStore.get("cliente-session")?.value;
  const clientSession = token ? await verifyClientToken(token) : null;

  if (!business) {
    notFound();
  }

  return (
    <main
      className="min-h-screen bg-[#F4F5F7] flex flex-col items-center px-4 py-12"
      style={{ "--brand-color": business.brandColor } as React.CSSProperties}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Card del negocio */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] p-8 flex flex-col items-center gap-6">
          {/* Logo */}
          {business.logoUrl ? (
            <div className="relative h-24 w-24 rounded-xl overflow-hidden border border-[#E0E0DB] shrink-0">
              <Image
                src={business.logoUrl}
                alt={`Logo de ${business.name}`}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-24 w-24 rounded-xl bg-[#F4F5F7] border border-[#E0E0DB] flex items-center justify-center shrink-0">
              <span className="font-heading text-3xl text-[var(--brand-color)] uppercase">
                {business.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Nombre */}
          <h1 className="font-heading text-2xl text-[#2A2829] text-center leading-tight">
            {business.name}
          </h1>

          {/* Info de contacto */}
          <div className="w-full flex flex-col gap-3">
            {business.address && (
              <div className="flex items-start gap-3 text-sm text-[#2A2829]">
                <MapPin
                  size={16}
                  className="text-[var(--brand-color)] mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{business.address}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-3 text-sm text-[#2A2829]">
                <Phone
                  size={16}
                  className="text-[var(--brand-color)] shrink-0"
                  aria-hidden="true"
                />
                <a
                  href={`tel:${business.phone}`}
                  className="hover:text-[var(--brand-color)] transition-colors"
                >
                  {business.phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Calendario y turnos */}
        <BookingSection
          slug={slug}
          businessName={business.name}
          cbu={business.cbu}
          alias={business.alias}
          phone={business.phone}
          clientSession={clientSession}
          initialEmployeeId={initialEmployeeId ?? null}
          initialSucursales={business.sucursales}
        />
      </div>
    </main>
  );
}
