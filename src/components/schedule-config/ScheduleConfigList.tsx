import { Pencil, Trash2, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ScheduleConfig = {
  id: string;
  nombre: string;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  daysOfWeek: string[];
  isActive: boolean;
};

type ScheduleConfigListProps = {
  configs: ScheduleConfig[];
  onEdit: (config: ScheduleConfig) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onAdd: () => void;
};

const DIAS_LABEL: Record<string, string> = {
  L: "Lun",
  M: "Mar",
  X: "Mié",
  J: "Jue",
  V: "Vie",
  S: "Sáb",
  D: "Dom",
};

const DIAS_ORDER = ["L", "M", "X", "J", "V", "S", "D"];

function formatDays(days: string[]): string {
  const ordered = DIAS_ORDER.filter((d) => days.includes(d));
  return ordered.map((d) => DIAS_LABEL[d]).join(", ");
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#253551] focus-visible:ring-offset-2",
        checked ? "bg-[#253551]" : "bg-[#E0E0DB] dark:bg-[#2d3548]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

export function ScheduleConfigList({
  configs,
  onEdit,
  onDelete,
  onToggle,
  onAdd,
}: ScheduleConfigListProps) {
  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] px-6 py-16 text-center">
        <CalendarDays size={40} className="text-[#E0E0DB]" aria-hidden="true" />
        <div>
          <p className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
            No tenés configuraciones de horario
          </p>
          <p className="mt-1 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Agregá tu primer horario para definir tu disponibilidad semanal.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="bg-[#253551] text-white hover:bg-[#1c2a40]"
        >
          Agregar horario
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {configs.map((config) => (
        <div
          key={config.id}
          className={cn(
            "rounded-lg border bg-white dark:bg-[#1e293b] p-4 transition-colors",
            config.isActive ? "border-[#E0E0DB] dark:border-[#2d3548]" : "border-[#E0E0DB] dark:border-[#2d3548] opacity-60"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-heading text-sm text-[#253551] dark:text-[#93c5fd] leading-tight block truncate">
                {config.nombre}
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2A2829]/60 dark:text-[#94a3b8]">
                <span className="flex items-center gap-1">
                  <Clock size={12} aria-hidden="true" />
                  {config.startTime} – {config.endTime} · cada {config.intervalMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={12} aria-hidden="true" />
                  {formatDays(config.daysOfWeek)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Toggle
                checked={config.isActive}
                onChange={() => onToggle(config.id)}
                label={config.isActive ? `Desactivar ${config.nombre}` : `Activar ${config.nombre}`}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(config)}
                aria-label={`Editar ${config.nombre}`}
                className="h-8 px-2"
              >
                <Pencil size={14} aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onDelete(config.id)}
                aria-label={`Eliminar ${config.nombre}`}
                className="h-8 px-2"
              >
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Botón siempre al final */}
      <div className="pt-1">
        <Button
          onClick={onAdd}
          variant="outline"
          className="w-full border-dashed border-[#E0E0DB] dark:border-[#2d3548] text-[#2A2829]/60 dark:text-[#94a3b8] hover:text-[#253551] hover:border-[#253551]"
        >
          + Agregar horario
        </Button>
      </div>
    </div>
  );
}
