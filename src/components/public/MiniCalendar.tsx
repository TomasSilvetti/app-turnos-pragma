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
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-5">
      {/* Header del mes */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => onMonthChange(subMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={16} className="text-gray-500" />
        </button>

        <span className="font-heading text-sm font-semibold text-[#2A2829] capitalize tracking-wide">
          {format(viewMonth, "MMMM yyyy", { locale: es })}
        </span>

        <button
          onClick={() => onMonthChange(addMonths(viewMonth, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] text-gray-400 py-1 uppercase tracking-widest font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Separador sutil */}
      <div className="border-t border-gray-50 mb-2" />

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-y-1">
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
                "relative flex flex-col items-center justify-center h-9 w-full text-sm transition-all duration-150",
                selected
                  ? "bg-[#253551] text-white shadow-md rounded-lg"
                  : todayDay && !available
                  ? "ring-2 ring-[#253551] ring-offset-1 text-[#253551] font-bold rounded-lg"
                  : available
                  ? "rounded-full bg-[#eef1f6] text-[#253551] font-semibold hover:bg-[#253551] hover:text-white cursor-pointer"
                  : "text-gray-300 cursor-default rounded-lg",
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
