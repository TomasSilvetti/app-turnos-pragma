"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getDay } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import type { ScheduleConfig } from "./ScheduleConfigList";
import { DisableSlotModal } from "./DisableSlotModal";

const DAY_CODE_BY_JS: Record<number, string> = {
  0: "D", 1: "L", 2: "M", 3: "X", 4: "J", 5: "V", 6: "S",
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
  const [disabledTimes, setDisabledTimes] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [modalTime, setModalTime] = useState<string | null>(null);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  // Fecha como string YYYY-MM-DD para la API
  const selectedDateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;

  const fetchDisabledSlots = useCallback(async (configId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/schedule-configs/disabled-slots?configId=${configId}&date=${date}`
      );
      if (res.ok) {
        const data = await res.json();
        setDisabledTimes(new Set((data.disabledSlots ?? []).map((ds: { time: string }) => ds.time)));
      }
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDay) {
      setDisabledTimes(new Set());
      setActiveConfigId(null);
      return;
    }

    const dayCode = DAY_CODE_BY_JS[getDay(selectedDay)];
    const config = configs.find((c) => c.isActive && c.daysOfWeek.includes(dayCode));

    if (!config) {
      setDisabledTimes(new Set());
      setActiveConfigId(null);
      return;
    }

    setActiveConfigId(config.id);
    fetchDisabledSlots(config.id, format(selectedDay, "yyyy-MM-dd"));
  }, [selectedDay, configs, fetchDisabledSlots]);

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
  const activeConfig = configs.find((c) => c.isActive && c.daysOfWeek.includes(dayCode));

  const isPorTipo = activeConfig ? activeConfig.intervalMinutes === 0 : false;

  const slots = activeConfig && !isPorTipo
    ? generateSlots(activeConfig.startTime, activeConfig.endTime, activeConfig.intervalMinutes)
    : [];

  const openedSlotDisabled = modalTime ? disabledTimes.has(modalTime) : false;

  async function handleDisable() {
    if (!modalTime || !activeConfigId || !selectedDateStr) return;

    const res = await fetch("/api/schedule-configs/disabled-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId: activeConfigId, date: selectedDateStr, time: modalTime }),
    });

    if (!res.ok) {
      console.error("Error al deshabilitar turno:", await res.json().catch(() => ({})));
      return;
    }

    await fetchDisabledSlots(activeConfigId, selectedDateStr);
    setModalTime(null);
  }

  async function handleEnable() {
    if (!modalTime || !activeConfigId || !selectedDateStr) return;

    await fetch("/api/schedule-configs/disabled-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId: activeConfigId, date: selectedDateStr, time: modalTime }),
    });

    await fetchDisabledSlots(activeConfigId, selectedDateStr);
    setModalTime(null);
  }

  return (
    <>
      <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#2d3548] shadow-sm p-5">
        <p className="font-heading text-xs text-gray-400 dark:text-slate-500 mb-4 capitalize uppercase tracking-widest">
          {dayLabel}
        </p>

        {isLoading || loadingSlots ? (
          <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="Cargando turnos">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-[#2d3548] animate-pulse" aria-hidden="true" />
            ))}
          </div>
        ) : !activeConfig ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
            No hay turnos disponibles para este día.
          </p>
        ) : isPorTipo ? (
          <div aria-label={`Horario del día ${dayLabel}`}>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
              Horario: {activeConfig.startTime} – {activeConfig.endTime} · duración según tipo de turno
            </p>
            <div className="relative">
              {generateSlots(activeConfig.startTime, activeConfig.endTime, 60).map((time) => (
                <div key={time} className="flex items-center gap-3 h-14">
                  <span className="text-xs text-gray-400 dark:text-slate-500 w-10 shrink-0 font-heading">
                    {time}
                  </span>
                  <div className="flex-1 border-t border-gray-100 dark:border-[#2d3548]" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ul className={cn("grid grid-cols-2 gap-2")} aria-label={`Turnos disponibles para ${dayLabel}`}>
            {slots.map((time) => {
              const disabled = disabledTimes.has(time);
              return (
                <li key={time}>
                  <button
                    type="button"
                    onClick={() => setModalTime(time)}
                    aria-label={`${time} — ${disabled ? "deshabilitado" : "disponible"}`}
                    className={cn(
                      "w-full flex items-center justify-between rounded-lg border px-4 py-3 shadow-sm transition-all text-left",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-1",
                      disabled
                        ? "border-gray-100 dark:border-[#2d3548] bg-gray-50 dark:bg-[#0f172a] opacity-60 hover:opacity-80"
                        : "border-gray-200 dark:border-[#2d3548] bg-white dark:bg-[#0f172a] hover:border-[var(--brand-color)] hover:bg-[#eef1f6] dark:hover:bg-[var(--brand-color)]/10 cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Clock
                        size={14}
                        className={disabled ? "text-gray-300 dark:text-slate-600" : "text-[var(--brand-color)]"}
                      />
                      <span className={cn(
                        "font-heading text-sm",
                        disabled ? "text-gray-400 dark:text-slate-600 line-through" : "text-gray-700 dark:text-[#e2e8f0]"
                      )}>
                        {time}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      disabled ? "text-gray-400 dark:text-slate-600" : "text-emerald-600"
                    )}>
                      {disabled ? "Deshabilitado" : "Disponible"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedDay && (
        <DisableSlotModal
          open={modalTime !== null}
          time={modalTime ?? ""}
          date={selectedDay}
          isDisabled={openedSlotDisabled}
          onClose={() => setModalTime(null)}
          onDisable={handleDisable}
          onEnable={handleEnable}
        />
      )}
    </>
  );
}
