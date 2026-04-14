import Link from "next/link";

export default function AccesoDenegadoPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-[#fef2f2] dark:bg-[#1f1515] flex items-center justify-center">
        <span
          className="material-symbols-outlined text-[#ef4444]"
          style={{ fontSize: "32px" }}
          translate="no"
        >
          lock
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-heading font-semibold text-[#2A2829] dark:text-[#e2e8f0]">
          Acceso denegado
        </h1>
        <p className="text-sm text-[#6b7280] dark:text-[#94a3b8] max-w-xs">
          No tenés permisos para ver esta sección. Consultá con el administrador de tu empresa si creés que es un error.
        </p>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: "var(--brand-color, #253551)" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">
          arrow_back
        </span>
        Volver al inicio
      </Link>
    </div>
  );
}
