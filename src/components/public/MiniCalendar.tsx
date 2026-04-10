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
  availableDates: string[]; // YYYY-MM-DD
  selectedDate: string | null;
  viewMonth: Date;
  onMonthChange: (month: Date) => void;
  onDaySelect: (date: string) => void;
};

const WEEK_DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export default function MiniCalendar({
  availableDates,
  selectedDate,
  viewMonth,
  onMonthChange,
  onDaySelect,
}: Props) {
  const today = new Date();
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = (getDay(monthStart) + 6) % 7;

  const availableSet = new Set(availableDates);

  function isAvailable(day: Date) {
    return availableSet.has(format(day, "yyyy-MM-dd"));
  }

  function isSelected(day: Date) {
    if (!selectedDate) return false;
    return isSameDay(day, parseISO(selectedDate));
  }

  function isToday(day: Date) {
    return isSameDay(day, today);
  }

  function handleDayClick(day: Date) {
    if (!isAvailable(day)) return;
    onDaySelect(format(day, "yyyy-MM-dd"));
  }

  return (
    <div className="rounded-lg bg-white border border-[#E0E0DB] p-5">
      {/* Header del mes */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange(subMonths(viewMonth, 1))}
          className="p-1 rounded hover:bg-[#F4F5F7] transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} className="text-[#2A2829]" />
        </button>

        <span className="font-heading text-sm text-[#2A2829] capitalize">
          {format(viewMonth, "MMMM yyyy", { locale: es })}
        </span>

        <button
          onClick={() => onMonthChange(addMonths(viewMonth, 1))}
          className="p-1 rounded hover:bg-[#F4F5F7] transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={16} className="text-[#2A2829]" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center font-small text-[10px] text-[#2A2829] opacity-50 py-1 uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day) => {
          const available = isAvailable(day);
          const selected = isSelected(day);
          const todayDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              disabled={!available}
              aria-label={format(day, "d 'de' MMMM", { locale: es })}
              aria-pressed={selected}
              className={[
                "relative flex flex-col items-center justify-center h-9 w-full rounded-md text-sm transition-colors",
                selected
                  ? "bg-[#253551] text-white"
                  : available
                  ? "hover:bg-[#eef1f6] text-[#2A2829] cursor-pointer"
                  : "text-[#2A2829] opacity-30 cursor-default",
              ].join(" ")}
            >
              <span className={todayDay && !selected ? "font-bold" : ""}>
                {format(day, "d")}
              </span>

              {available && !selected && (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full bg-[#253551]"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
