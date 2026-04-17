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

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getConfigIdForTime(time: string, sortedConfigs: ScheduleConfig[]): string | null {
  const timeMin = timeToMinutes(time);
  for (const config of sortedConfigs) {
    const start = timeToMinutes(config.startTime);
    const end = timeToMinutes(config.endTime);
    if (timeMin >= start && timeMin < end) return config.id;
  }
  return sortedConfigs[sortedConfigs.length - 1]?.id ?? null;
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
  const [modalConfigId, setModalConfigId] = useState<string | null>(null);

  // Fecha como string YYYY-MM-DD para la API
  const selectedDateStr = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;

  const fetchAllDisabledSlots = useCallback(async (configIds: string[], date: string) => {
    setLoadingSlots(true);
    try {
      const results = await Promise.all(
        configIds.map((id) =>
          fetch(`/api/schedule-configs/disabled-slots?configId=${id}&date=${date}`)
            .then((r) => (r.ok ? r.json() : { disabledSlots: [] }))
            .then((data) => (data.disabledSlots ?? []).map((ds: { time: string }) => ds.time))
        )
      );
      setDisabledTimes(new Set<string>(results.flat()));
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDay) {
      setDisabledTimes(new Set());
      setModalConfigId(null);
      return;
    }

    const dayCode = DAY_CODE_BY_JS[getDay(selectedDay)];
    const matchingConfigs = configs.filter((c) => c.isActive && c.daysOfWeek.includes(dayCode));

    if (matchingConfigs.length === 0) {
      setDisabledTimes(new Set());
      setModalConfigId(null);
      return;
    }

    fetchAllDisabledSlots(matchingConfigs.map((c) => c.id), format(selectedDay, "yyyy-MM-dd"));
  }, [selectedDay, configs, fetchAllDisabledSlots]);

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
  const sortedActiveConfigs = configs
    .filter((c) => c.isActive && c.daysOfWeek.includes(dayCode))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const activeConfig = sortedActiveConfigs[0] ?? null;
  const isPorTipo = activeConfig ? activeConfig.intervalMinutes === 0 : false;

  // Huecos entre configs consecutivas

  const gaps: { from: string; to: string }[] = [];
  for (let i = 0; i < sortedActiveConfigs.length - 1; i++) {
    if (sortedActiveConfigs[i].endTime < sortedActiveConfigs[i + 1].startTime) {
      gaps.push({ from: sortedActiveConfigs[i].endTime, to: sortedActiveConfigs[i + 1].startTime });
    }
  }

  const overallStart = sortedActiveConfigs[0]?.startTime ?? "";
  const overallEnd = sortedActiveConfigs[sortedActiveConfigs.length - 1]?.endTime ?? "";

  const openedSlotDisabled = modalTime ? disabledTimes.has(modalTime) : false;

  async function handleDisable() {
    if (!modalTime || !modalConfigId || !selectedDateStr || !selectedDay) return;

    const res = await fetch("/api/schedule-configs/disabled-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId: modalConfigId, date: selectedDateStr, time: modalTime }),
    });

    if (!res.ok) {
      console.error("Error al deshabilitar turno:", await res.json().catch(() => ({})));
      return;
    }

    const dayCode = DAY_CODE_BY_JS[getDay(selectedDay)];
    const configIds = configs.filter((c) => c.isActive && c.daysOfWeek.includes(dayCode)).map((c) => c.id);
    await fetchAllDisabledSlots(configIds, selectedDateStr);
    setModalTime(null);
  }

  async function handleEnable() {
    if (!modalTime || !modalConfigId || !selectedDateStr || !selectedDay) return;

    await fetch("/api/schedule-configs/disabled-slots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId: modalConfigId, date: selectedDateStr, time: modalTime }),
    });

    const dayCode = DAY_CODE_BY_JS[getDay(selectedDay)];
    const configIds = configs.filter((c) => c.isActive && c.daysOfWeek.includes(dayCode)).map((c) => c.id);
    await fetchAllDisabledSlots(configIds, selectedDateStr);
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
              Horario: {overallStart} – {overallEnd} · duración según tipo de turno
            </p>
            <div className="relative">
              {sortedActiveConfigs.map((config, configIdx) => (
                <div key={config.id}>
                  {generateSlots(config.startTime, config.endTime, 60).map((time) => (
                    <div key={time} className="flex items-center gap-3 h-14">
                      <span className="text-xs text-gray-400 dark:text-slate-500 w-10 shrink-0 font-heading">
                        {time}
                      </span>
                      <div className="flex-1 border-t border-gray-100 dark:border-[#2d3548]" />
                    </div>
                  ))}
                  {configIdx < sortedActiveConfigs.length - 1 && gaps[configIdx] && (
                    <div className="flex items-center gap-3 py-2 my-1">
                      <span className="text-xs text-gray-300 dark:text-slate-600 w-10 shrink-0 font-heading">
                        {gaps[configIdx].from}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 border-t border-dashed border-gray-200 dark:border-[#2d3548]" />
                        <span className="text-[10px] font-medium text-gray-300 dark:text-slate-600 uppercase tracking-wide whitespace-nowrap">
                          Sin cobertura hasta {gaps[configIdx].to}
                        </span>
                        <div className="flex-1 border-t border-dashed border-gray-200 dark:border-[#2d3548]" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedActiveConfigs.map((config, configIdx) => {
              const configSlots = generateSlots(config.startTime, config.endTime, config.intervalMinutes);
              return (
                <div key={config.id}>
                  {configIdx > 0 && gaps[configIdx - 1] && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 border-t border-dashed border-gray-200 dark:border-[#2d3548]" />
                      <span className="text-[10px] font-medium text-gray-300 dark:text-slate-600 uppercase tracking-wide whitespace-nowrap">
                        Sin cobertura: {gaps[configIdx - 1].from} – {gaps[configIdx - 1].to}
                      </span>
                      <div className="flex-1 border-t border-dashed border-gray-200 dark:border-[#2d3548]" />
                    </div>
                  )}
                  <ul className={cn("grid grid-cols-2 gap-2")} aria-label={`Turnos ${config.startTime}–${config.endTime}`}>
                    {configSlots.map((time) => {
                      const disabled = disabledTimes.has(time);
                      return (
                        <li key={time}>
                          <button
                            type="button"
                            onClick={() => {
                              setModalConfigId(config.id);
                              setModalTime(time);
                            }}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedDay && (
        <DisableSlotModal
          open={modalTime !== null && modalConfigId !== null}
          time={modalTime ?? ""}
          date={selectedDay}
          isDisabled={openedSlotDisabled}
          onClose={() => { setModalTime(null); setModalConfigId(null); }}
          onDisable={handleDisable}
          onEnable={handleEnable}
        />
      )}
    </>
  );
}
