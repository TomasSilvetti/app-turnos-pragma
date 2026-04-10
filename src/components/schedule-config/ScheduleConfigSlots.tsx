"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDay } from "date-fns";
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
      <div className="rounded-lg border border-[#E0E0DB] bg-white p-5">
        <p className="text-sm text-[#2A2829]/50 text-center py-4">
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
    <div className="rounded-lg border border-[#E0E0DB] bg-white p-5">
      <p className="font-heading text-sm text-[#253551] mb-4 capitalize">
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
              className="h-12 rounded-lg bg-[#E0E0DB]/50 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-[#2A2829]/50 text-center py-4">
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
              className="flex flex-col items-center justify-center rounded-lg border border-[#E0E0DB] bg-[#F4F5F7] px-3 py-3 gap-0.5"
            >
              <span className="font-heading text-sm text-[#253551]">{time}</span>
              <span className="text-xs text-[#22c55e] font-medium">Disponible</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
