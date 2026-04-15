import { MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Image from "next/image";
import BookingSection from "@/components/public/BookingSection";
import { verifyClientToken } from "@/lib/cliente-auth";

type BusinessPublicData = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  cbu: string | null;
  alias: string | null;
  theme: string;
  brandColor: string | null;
  sucursales: { id: string; name: string; address: string }[];
};

async function getBusinessBySlug(
  slug: string
): Promise<BusinessPublicData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3001";
  const res = await fetch(`${baseUrl}/api/public/business/${slug}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Error al obtener datos del negocio");
  return res.json();
}

export default async function PublicBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ employee?: string }>;
}) {
  const { slug } = await params;
  const { employee: initialEmployeeId } = await searchParams;
  const business = await getBusinessBySlug(slug);

  const cookieStore = await cookies();
  const token = cookieStore.get("cliente-session")?.value;
  const clientSession = token ? await verifyClientToken(token) : null;

  if (!business) {
    notFound();
  }

  const isDark = business.theme === "dark";
  const brandColor = business.brandColor ?? "#253551";

  return (
    <main
      className={`min-h-screen flex flex-col items-center px-4 py-12 ${isDark ? "dark bg-[#0f172a]" : "bg-gray-50"}`}
      style={{ "--brand-color": brandColor } as React.CSSProperties}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Card del negocio */}
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex flex-col items-center gap-5">
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
            <div className="h-24 w-24 rounded-xl bg-muted border border-[#E0E0DB] flex items-center justify-center shrink-0">
              <span className="font-heading text-3xl text-primary uppercase">
                {business.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Nombre */}
          <h1 className="font-heading text-2xl text-foreground text-center leading-tight">
            {business.name}
          </h1>

          {/* Info de contacto */}
          {(business.address || business.phone) && (
            <div className="w-full flex flex-col gap-3">
              {business.address && (
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <MapPin
                    size={16}
                    className="text-primary mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{business.address}</span>
                </div>
              )}
              {business.phone && (
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Phone
                    size={16}
                    className="text-primary shrink-0"
                    aria-hidden="true"
                  />
                  <a
                    href={`tel:${business.phone}`}
                    className="hover:text-primary transition-colors"
                  >
                    {business.phone}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Calendario y turnos */}
        <BookingSection slug={slug} businessName={business.name} cbu={business.cbu} alias={business.alias} phone={business.phone} clientSession={clientSession} initialEmployeeId={initialEmployeeId ?? null} initialSucursales={business.sucursales} />
      </div>
    </main>
  );
}
