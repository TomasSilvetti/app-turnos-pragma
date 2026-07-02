"use client";

import { Loader2, UserCircle2 } from "lucide-react";
import { useEmpleado } from "@/components/lavanderia/EmpleadoProvider";
import { TerminadosGrid } from "@/components/lavanderia/TerminadosGrid";

export default function TerminadosPage() {
  const { ready, empleadoActivo } = useEmpleado();

  if (!ready) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!empleadoActivo) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <UserCircle2 className="mx-auto mb-3 size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Elegí tu usuario en el menú de arriba para ver las OTs terminadas.
        </p>
      </div>
    );
  }

  return (
    <div className="px-3 py-5 sm:px-5">
      <TerminadosGrid />
    </div>
  );
}
