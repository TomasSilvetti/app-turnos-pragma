import Link from "next/link";

export default function SlugNotFound() {
  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white border border-[#E0E0DB] p-8 flex flex-col items-center gap-6 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <span
            className="material-symbols-outlined text-3xl text-primary"
            aria-hidden="true"
            translate="no"
          >
            search_off
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-2xl text-foreground">
            No encontramos este negocio
          </h1>
          <p className="text-sm text-foreground/60 font-body">
            El link que ingresaste no corresponde a ningún negocio registrado.
            Puede que esté mal escrito o que ya no exista.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <p className="text-sm text-foreground/60 font-body">
            Si recibiste este link de un prestador, pedile que te lo reenvíe o
            contactalo directamente.
          </p>
          <Link
            href="/"
            className="w-full rounded-md bg-primary hover:bg-primary-hover text-white text-sm font-body font-medium py-2.5 px-4 transition-colors text-center"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
