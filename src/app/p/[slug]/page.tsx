import { MapPin, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookingSection from "@/components/public/BookingSection";

type BusinessPublicData = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);

  if (!business) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Card del negocio */}
        <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 flex flex-col items-center gap-5">
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
        <BookingSection slug={slug} businessName={business.name} />
      </div>
    </main>
  );
}
