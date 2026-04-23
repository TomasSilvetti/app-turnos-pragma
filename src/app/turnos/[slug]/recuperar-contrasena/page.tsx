import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RecuperarContrasenaClient from "@/components/public/RecuperarContrasenaClient";

const DEFAULT_BRAND_COLOR = "#253551";

export default async function RecuperarContrasenaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const business = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { name: true, brandColor: true },
  });

  if (!business) {
    notFound();
  }

  return (
    <RecuperarContrasenaClient
      slug={slug}
      businessName={business.name}
      brandColor={business.brandColor ?? DEFAULT_BRAND_COLOR}
    />
  );
}
