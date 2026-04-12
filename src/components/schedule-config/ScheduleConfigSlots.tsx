"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDay } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScheduleConfig } from "./ScheduleConfigList";

// Mapeo: resultado de getDay() → código de día del sistema
const DAY_CODE_BY_JS: Record<number, string> = {
  0: "D",
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
};

function generateSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  const slots: string[] = [];
  for (let t = startTotal; t < endTotal; t += intervalMinutes) {
    const h = Math.floor(t / 60).toString().padStart(2, "0");
    const m = (t % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
  }
  return slots;
}

type ScheduleConfigSlotsProps = {
  configs: ScheduleConfig[];
  selectedDay: Date | null;
  isLoading?: boolean;
};

export function ScheduleConfigSlots({
  configs,
  selectedDay,
  isLoading = false,
}: ScheduleConfigSlotsProps) {
  if (!selectedDay) {
    return (
      <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#2d3548] shadow-sm p-6 flex flex-col items-center gap-3 py-12">
        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#2d3548] flex items-center justify-center">
          <Clock size={22} className="text-gray-300" aria-hidden="true" />
        </div>
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center">
          Seleccioná un día del calendario para ver los turnos disponibles.
        </p>
      </div>
    );
  }

  const dayLabel = format(selectedDay, "EEEE d 'de' MMMM", { locale: es });
  const dayCode = DAY_CODE_BY_JS[getDay(selectedDay)];
  const activeConfig = configs
    .filter((c) => c.isActive && c.daysOfWeek.includes(dayCode))
    .at(0);

  const slots = activeConfig
    ? generateSlots(activeConfig.startTime, activeConfig.endTime, activeConfig.intervalMinutes)
    : [];

  return (
    <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#2d3548] shadow-sm p-5">
      <p className="font-heading text-xs text-gray-400 dark:text-slate-500 mb-4 capitalize uppercase tracking-widest">
        {dayLabel}
      </p>

      {isLoading ? (
        <div
          className="grid grid-cols-2 gap-2"
          aria-busy="true"
          aria-label="Cargando turnos"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-gray-100 dark:bg-[#2d3548] animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
          No hay turnos disponibles para este día.
        </p>
      ) : (
        <ul
          className={cn("grid grid-cols-2 gap-2")}
          aria-label={`Turnos disponibles para ${dayLabel}`}
        >
          {slots.map((time) => (
            <li
              key={time}
              className="group flex items-center justify-between rounded-lg border border-gray-200 dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#253551]" />
                <span className="font-heading text-sm text-gray-700 dark:text-[#e2e8f0]">{time}</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600">
                Disponible
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
