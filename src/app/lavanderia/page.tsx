"use client";

import { Loader2, UserCircle2 } from "lucide-react";
import { useEmpleado } from "@/components/lavanderia/EmpleadoProvider";
import { TableroKanban } from "@/components/lavanderia/TableroKanban";
import { CargaFotoOT } from "@/components/lavanderia/CargaFotoOT";
import { useEsMobile } from "@/hooks/useEsMobile";

export default function LavanderiaHomePage() {
  const { ready, empleadoActivo } = useEmpleado();
  const esMobile = useEsMobile();

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
          Elegí tu usuario en el menú de arriba para empezar a trabajar.
        </p>
      </div>
    );
  }

  // El celular muestra la carga por foto; el desktop, el tablero.
  if (esMobile) return <CargaFotoOT />;

  return <TableroKanban empleadoId={empleadoActivo.id} />;
}
