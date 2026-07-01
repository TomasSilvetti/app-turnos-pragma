"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Flame, Shirt, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiaSnap, OTSnap } from "@/lib/lavanderia/tablero";

type Resultado = {
  ot: OTSnap;
  fecha: string;
  dia: string;
  fechaCorta: string;
  prendaMatch: string | null;
};

const MAX_RESULTADOS = 20;

export function BuscadorOT({
  dias,
  onSeleccionar,
}: {
  dias: DiaSnap[];
  onSeleccionar: (ot: OTSnap, fecha: string) => void;
}) {
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contRef = useRef<HTMLDivElement>(null);

  const resultados = useMemo<Resultado[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out: Resultado[] = [];
    for (const dia of dias) {
      for (const ot of dia.ots) {
        const enNumero = ot.numero?.toLowerCase().includes(term);
        const enCliente = ot.nombreCliente?.toLowerCase().includes(term);
        const prenda = ot.items.find((it) => it.descripcion.toLowerCase().includes(term));
        if (enNumero || enCliente || prenda) {
          out.push({
            ot,
            fecha: dia.fecha,
            dia: dia.dia,
            fechaCorta: dia.fechaCorta,
            prendaMatch: prenda?.descripcion ?? null,
          });
        }
        if (out.length >= MAX_RESULTADOS) return out;
      }
    }
    return out;
  }, [q, dias]);

  // Cierra el desplegable al hacer click fuera del buscador.
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (contRef.current && !contRef.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [abierto]);

  const seleccionar = (r: Resultado) => {
    onSeleccionar(r.ot, r.fecha);
    setAbierto(false);
  };

  return (
    <div ref={contRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar OT, prenda o cliente…"
          className="w-full rounded-full border border-white/70 bg-white/80 py-2 pl-9 pr-9 text-sm text-slate-700 shadow-sm outline-none backdrop-blur transition-colors placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setAbierto(false);
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {abierto && q.trim() && (
        <div className="absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-1.5 shadow-[0_12px_36px_-10px_rgba(16,24,40,0.35)] backdrop-blur-xl">
          {resultados.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-400">Sin resultados</p>
          ) : (
            resultados.map((r) => {
              const titulo = r.ot.numero ? `OT ${r.ot.numero}` : r.ot.nombreCliente || "OT";
              return (
                <button
                  key={r.ot.id}
                  onClick={() => seleccionar(r)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-sky-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-slate-800">{titulo}</span>
                      {r.ot.urgente && r.ot.estado !== "terminado" && (
                        <Flame className="size-3.5 shrink-0 text-red-500" />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                      {r.ot.nombreCliente && r.ot.numero && (
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3" /> {r.ot.nombreCliente}
                        </span>
                      )}
                      {r.prendaMatch && (
                        <span className="inline-flex items-center gap-1">
                          <Shirt className="size-3" /> {r.prendaMatch}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-500">
                    {r.dia} {r.fechaCorta}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
