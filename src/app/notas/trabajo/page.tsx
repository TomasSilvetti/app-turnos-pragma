"use client";

// La carga inicial sincroniza con la API en cuanto el device está listo, que es
// el uso previsto de un effect (igual que en /notas/[id]).
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, OctagonAlert, CheckCheck, Loader2, Inbox, FileSearch } from "lucide-react";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { NotasNav } from "@/components/notas/NotasNav";
import { OfflineBadge } from "@/components/notas/OfflineBadge";
import { HarnessPanel } from "@/components/notas/trabajo/HarnessPanel";
import type { ItemTrabajo } from "@/lib/notas/trabajoClient";

// Las tres notas de la sección son fijas y no se pueden borrar: son las bandejas
// entre las que el ítem se mueve solo (pendiente → completado, o → bloqueado
// cuando la sesión necesita algo del usuario).
const NOTAS_FIJAS = [
  {
    clave: "bandeja",
    titulo: "Bandeja en crudo",
    descripcion: "Pegá el pegote acá y salen los ítems.",
    icono: Inbox,
    color: "text-muted-foreground",
  },
  {
    clave: "propuestos",
    titulo: "Propuestos por el itemizador",
    descripcion: "Lo que salió de un informe y espera tu visto bueno.",
    icono: FileSearch,
    color: "text-sky-500",
  },
  {
    clave: "pendiente",
    titulo: "Lista de trabajo pendiente",
    descripcion: "Lo que el harness tiene por hacer, en orden.",
    icono: ListTodo,
    color: "text-primary",
  },
  {
    clave: "bloqueados",
    titulo: "Bloqueados",
    descripcion: "Se trabaron esperando algo tuyo.",
    icono: OctagonAlert,
    color: "text-amber-500",
  },
  {
    clave: "completados",
    titulo: "Trabajo completado",
    descripcion: "El archivo, con su log y sus capturas.",
    icono: CheckCheck,
    color: "text-emerald-500",
  },
] as const;

export default function TrabajoPage() {
  const router = useRouter();
  const { deviceId, ready } = useNotaDevice();
  const [items, setItems] = useState<ItemTrabajo[] | null>(null);
  // Lo que se muestra en la tarjeta de la bandeja no son ítems sino ventanas
  // esperando que las confirmes.
  const [sugerencias, setSugerencias] = useState(0);

  const cargar = useCallback(async () => {
    const [resItems, resBandeja] = await Promise.all([
      notasFetch("/api/notas/trabajo/items").catch(() => null),
      notasFetch("/api/notas/trabajo/bandeja").catch(() => null),
    ]);
    if (resItems?.ok) {
      const { items } = await resItems.json();
      setItems(items);
    } else {
      setItems([]);
    }
    if (resBandeja?.ok) {
      const { bandeja } = await resBandeja.json();
      setSugerencias(bandeja?.sugerencias?.length ?? 0);
    }
  }, []);

  useEffect(() => {
    if (ready && deviceId) cargar();
  }, [ready, deviceId, cargar]);

  const contar = (clave: string) => {
    if (clave === "bandeja") return sugerencias;
    if (!items) return null;
    if (clave === "propuestos") return items.filter((i) => i.estado === "propuesto").length;
    if (clave === "pendiente") return items.filter((i) => i.estado === "pendiente" || i.estado === "en_curso").length;
    if (clave === "bloqueados") return items.filter((i) => i.estado === "bloqueado").length;
    return items.filter((i) => i.estado === "completado").length;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-2">
        <NotasNav actual="trabajo" />
        <div className="flex items-center gap-2">
          <OfflineBadge />
          <ThemeToggle />
        </div>
      </header>

      <HarnessPanel />

      {!items ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {NOTAS_FIJAS.map((n) => {
            const Icono = n.icono;
            const total = contar(n.clave);
            return (
              <li key={n.clave}>
                <button
                  onClick={() => router.push(`/notas/trabajo/${n.clave}`)}
                  className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <Icono className={`size-4 ${n.color}`} />
                    <span className="font-medium">{n.titulo}</span>
                    <span className="ml-auto text-sm font-semibold tabular-nums text-muted-foreground">{total}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{n.descripcion}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
