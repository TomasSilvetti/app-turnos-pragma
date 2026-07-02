"use client";

import { cn } from "@/lib/utils";

// Alterna la cantidad de días visibles del tablero (7 detallado ↔ 14 comprimido).
export function ToggleVista({ vista, onVista }: { vista: 7 | 14; onVista: (v: 7 | 14) => void }) {
  return (
    <div className="inline-flex shrink-0 rounded-full border border-white/70 bg-white/70 p-0.5 text-xs font-medium shadow-sm backdrop-blur">
      {([7, 14] as const).map((v) => (
        <button
          key={v}
          onClick={() => onVista(v)}
          className={cn(
            "rounded-full px-3 py-1 transition-colors",
            vista === v
              ? "bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_2px_8px_-2px_rgba(56,120,255,0.6)]"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {v} días
        </button>
      ))}
    </div>
  );
}
