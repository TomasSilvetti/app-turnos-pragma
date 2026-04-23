import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RestablecerContrasenaClient from "@/components/public/RestablecerContrasenaClient";

const DEFAULT_BRAND_COLOR = "#253551";

export default async function RestablecerContrasenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;

  const business = await prisma.businessProfile.findUnique({
    where: { slug },
    select: { name: true, brandColor: true },
  });

  if (!business) {
    notFound();
  }

  return (
    <RestablecerContrasenaClient
      slug={slug}
      businessName={business.name}
      brandColor={business.brandColor ?? DEFAULT_BRAND_COLOR}
      token={token ?? ""}
    />
  );
}
