"use client";

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// Selector de hora 24hs con minuto exacto (no restringido a múltiplos de 15).
export function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hh = "09", mm = "00"] = value.split(":");
  const selectClass =
    "rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="flex items-center gap-2">
      <select className={selectClass} value={hh} onChange={(e) => onChange(`${e.target.value}:${mm}`)} aria-label="Hora">
        {HORAS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-lg font-semibold text-muted-foreground">:</span>
      <select className={selectClass} value={mm} onChange={(e) => onChange(`${hh}:${e.target.value}`)} aria-label="Minutos">
        {MINUTOS.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <span className="ml-1 text-xs text-muted-foreground">24 hs</span>
    </div>
  );
}
