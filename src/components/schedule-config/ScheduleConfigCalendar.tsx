import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  format,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ScheduleConfig } from "./ScheduleConfigList";

// date-fns getDay: 0=Dom, 1=Lun, ..., 6=Sáb
// Nuestro sistema: L=1,M=2,X=3,J=4,V=5,S=6,D=0 (domingo)
const DAY_CODE_BY_JS: Record<number, string> = {
  0: "D",
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
};

const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function getEnabledDayCodes(configs: ScheduleConfig[]): Set<string> {
  const active = configs.filter((c) => c.isActive);
  const codes = new Set<string>();
  for (const config of active) {
    for (const code of config.daysOfWeek) {
      codes.add(code);
    }
  }
  return codes;
}

function buildCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
}

type ScheduleConfigCalendarProps = {
  configs: ScheduleConfig[];
  onDaySelect: (date: Date) => void;
};

export function ScheduleConfigCalendar({
  configs,
  onDaySelect,
}: ScheduleConfigCalendarProps) {
  const today = new Date();
  const enabledCodes = getEnabledDayCodes(configs);
  const days = buildCalendarDays(today);
  const monthLabel = format(today, "MMMM yyyy", { locale: es });

  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
      {/* Encabezado del mes */}
      <p className="font-heading text-sm font-semibold text-[#2A2829] mb-5 capitalize tracking-wide">
        {monthLabel}
      </p>

      {/* Cabecera días de la semana */}
      <div className="grid grid-cols-7 mb-2" role="row">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] font-medium text-gray-400 py-1 uppercase tracking-widest"
            aria-hidden="true"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="border-t border-gray-50 mb-2" />

      {/* Grilla de días */}
      <div
        className="grid grid-cols-7 gap-y-1"
        role="grid"
        aria-label={`Calendario de ${monthLabel}`}
      >
        {days.map((day) => {
          const inMonth = isSameMonth(day, today);
          const jsDay = getDay(day);
          const code = DAY_CODE_BY_JS[jsDay];
          const enabled = inMonth && enabledCodes.has(code);
          const label = format(day, "d 'de' MMMM", { locale: es });

          return (
            <div key={day.toISOString()} role="gridcell" className="flex justify-center">
              <button
                type="button"
                disabled={!enabled}
                onClick={enabled ? () => onDaySelect(day) : undefined}
                aria-label={
                  enabled
                    ? `Seleccionar ${label}`
                    : `${label} — no disponible`
                }
                aria-disabled={!enabled}
                className={cn(
                  "h-8 w-8 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#253551] focus-visible:ring-offset-1",
                  !inMonth && "invisible pointer-events-none",
                  inMonth && enabled &&
                    "bg-[#eef1f6] text-[#253551] hover:bg-[#253551] hover:text-white cursor-pointer",
                  inMonth && !enabled &&
                    "text-[#2A2829]/25 cursor-default"
                )}
              >
                {inMonth ? format(day, "d") : ""}
              </button>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-[#eef1f6] border border-[#253551]/20" aria-hidden="true" />
          Día habilitado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-gray-100" aria-hidden="true" />
          Sin cobertura
        </span>
      </div>
    </div>
  );
}
