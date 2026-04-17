"use client";

import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  availableDates?: string[]; // YYYY-MM-DD — si es undefined, todos los días son seleccionables
  selectedDate: string | null;
  viewMonth: Date;
  onMonthChange: (month: Date) => void;
  onDaySelect: (date: string) => void;
  originalDate?: string | null; // YYYY-MM-DD — día original del turno
  clientBookingDates?: string[]; // YYYY-MM-DD — días con turno propio del cliente
};

const WEEK_DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export default function MiniCalendar({
  availableDates,
  selectedDate,
  viewMonth,
  onMonthChange,
  onDaySelect,
  originalDate,
  clientBookingDates,
}: Props) {
  const today = new Date();
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = (getDay(monthStart) + 6) % 7;

  const availableSet = availableDates !== undefined ? new Set(availableDates) : null;
  const clientBookingSet = new Set(clientBookingDates ?? []);

  function isAvailable(day: Date) {
    // Si availableDates es undefined, todos los días desde hoy son seleccionables
    if (availableSet === null) {
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      return day >= todayStart;
    }
    return availableSet.has(format(day, "yyyy-MM-dd"));
  }

  function isSelected(day: Date) {
    if (!selectedDate) return false;
    return isSameDay(day, parseISO(selectedDate));
  }

  function isToday(day: Date) {
    return isSameDay(day, today);
  }

  function isOriginal(day: Date) {
    if (!originalDate) return false;
    return isSameDay(day, parseISO(originalDate));
  }

  function isClientBooking(day: Date) {
    return clientBookingSet.has(format(day, "yyyy-MM-dd"));
  }

  function handleDayClick(day: Date) {
    if (!isAvailable(day)) return;
    onDaySelect(format(day, "yyyy-MM-dd"));
  }

  return (
    <div className="rounded-xl bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-[#2d3548] shadow-sm p-5">
      {/* Leyendas */}
      {(originalDate || (clientBookingDates && clientBookingDates.length > 0)) && (
        <div className="flex flex-col gap-1.5 mb-4 px-1">
          {originalDate && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
              <span className="font-body text-xs text-amber-700 dark:text-amber-400">
                Día original del turno
              </span>
            </div>
          )}
          {clientBookingDates && clientBookingDates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[var(--brand-color)]/40 ring-1 ring-[var(--brand-color)] shrink-0" aria-hidden="true" />
              <span className="font-body text-xs text-[var(--brand-color)] dark:text-[#93c5fd]">
                Tu turno reservado
              </span>
            </div>
          )}
        </div>
      )}

      {/* Header del mes */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => onMonthChange(subMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#2d3548] transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} className="text-gray-500 dark:text-[#94a3b8]" />
        </button>

        <span className="font-heading text-sm font-semibold text-[#2A2829] dark:text-[#e2e8f0] capitalize tracking-wide">
          {format(viewMonth, "MMMM yyyy", { locale: es })}
        </span>

        <button
          onClick={() => onMonthChange(addMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#2d3548] transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={16} className="text-gray-500 dark:text-[#94a3b8]" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] text-gray-400 dark:text-[#64748b] py-1 uppercase tracking-widest font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Separador sutil */}
      <div className="border-t border-gray-50 dark:border-[#2d3548] mb-2" />

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const available = isAvailable(day);
          const selected = isSelected(day);
          const todayDay = isToday(day);
          const originalDay = isOriginal(day);
          const clientBookingDay = isClientBooking(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              disabled={!available}
              aria-label={format(day, "d 'de' MMMM", { locale: es })}
              aria-pressed={selected}
              className={[
                "relative flex flex-col items-center justify-center h-9 w-full text-sm transition-all duration-150",
                selected
                  ? "bg-[var(--brand-color)] text-white shadow-md rounded-lg"
                  : originalDay
                  ? "bg-amber-400 text-white font-semibold rounded-lg"
                  : clientBookingDay
                  ? "bg-[var(--brand-color)]/20 text-[var(--brand-color)] dark:text-[#93c5fd] font-semibold ring-1 ring-[var(--brand-color)]/50 rounded-lg hover:bg-[var(--brand-color)] hover:text-white hover:ring-0 cursor-pointer"
                  : todayDay && !available
                  ? "ring-2 ring-[var(--brand-color)] ring-offset-1 dark:ring-offset-[#1e293b] text-[var(--brand-color)] dark:text-[#93c5fd] font-bold rounded-lg"
                  : available
                  ? "rounded-full bg-[#eef1f6] dark:bg-[#2d3548] text-[var(--brand-color)] dark:text-[#e2e8f0] font-semibold hover:bg-[var(--brand-color)] hover:text-white cursor-pointer"
                  : "text-gray-300 dark:text-[#475569] cursor-default rounded-lg",
              ].join(" ")}
            >
              <span>{format(day, "d")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
