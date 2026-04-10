import Link from "next/link";
import { TriangleAlert } from "lucide-react";

interface RescheduleBannerProps {
  count: number;
}

export default function RescheduleBanner({ count }: RescheduleBannerProps) {
  if (count === 0) return null;

  const label =
    count === 1
      ? "Tenés 1 cliente que necesita ser reprogramado"
      : `Tenés ${count} clientes que necesitan ser reprogramados`;

  return (
    <div
      role="alert"
      className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-900"
    >
      <TriangleAlert size={20} className="shrink-0 text-yellow-600" aria-hidden="true" />
      <p className="flex-1 font-body text-sm">{label}</p>
      <Link
        href="/panel/reprogramaciones"
        className="shrink-0 rounded-md bg-yellow-400 px-3 py-1.5 text-sm font-medium text-yellow-900 transition-colors hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-600"
      >
        Ver reprogramaciones
      </Link>
    </div>
  );
}
