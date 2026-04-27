"use client";

import { useState, useRef, useEffect } from "react";
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
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  className?: string;
};

const WEEK_DAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function toDisplay(v: string): string {
  if (!v) return "";
  const d = parseISO(v);
  if (!isValid(d)) return "";
  return format(d, "dd/MM/yyyy");
}

export function DatePickerInput({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    if (value) {
      const d = parseISO(value);
      return isValid(d) ? d : new Date();
    }
    return new Date();
  });

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync viewMonth when value changes externally
  useEffect(() => {
    if (value) {
      const d = parseISO(value);
      if (isValid(d)) setViewMonth(d);
    }
  }, [value]);

  function handleSelect(day: Date) {
    onChange(format(day, "yyyy-MM-dd"));
    setOpen(false);
  }

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7;

  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Input */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm transition-colors text-left",
          "bg-white dark:bg-[#0c1220]",
          open
            ? "border-[var(--brand-color)] ring-2 ring-[var(--brand-color)]/15"
            : "border-[#E0E0DB] dark:border-[#1a2840] hover:border-[#c0c0ba] dark:hover:border-[#3d4a60]"
        )}
      >
        <span className="material-symbols-outlined text-[16px] text-[#2A2829]/40 dark:text-[#94a3b8]">
          calendar_today
        </span>
        <span
          className={cn(
            selectedDate
              ? "text-[#2A2829] dark:text-[#e2e8f0]"
              : "text-[#2A2829]/40 dark:text-[#94a3b8]"
          )}
        >
          {selectedDate ? toDisplay(value) : "dd/mm/yyyy"}
        </span>
      </button>

      {/* Calendar popup */}
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 rounded-xl border shadow-lg overflow-hidden",
            "bg-white dark:bg-[#0c1220]",
            "border-[#E0E0DB] dark:border-[#1a2840]",
            "w-64 p-4"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1a2840] transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={15} className="text-[#2A2829]/50 dark:text-[#94a3b8]" />
            </button>

            <span className="font-heading text-sm font-semibold text-[#2A2829] dark:text-[#e2e8f0] capitalize">
              {format(viewMonth, "MMMM yyyy", { locale: es })}
            </span>

            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1a2840] transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={15} className="text-[#2A2829]/50 dark:text-[#94a3b8]" />
            </button>
          </div>

          {/* Week days header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] text-[#2A2829]/40 dark:text-[#64748b] py-1 uppercase tracking-widest font-medium"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="border-t border-[#E0E0DB] dark:border-[#1a2840] mb-2" />

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  aria-label={format(day, "d 'de' MMMM", { locale: es })}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex items-center justify-center h-8 w-full text-sm rounded-lg transition-all duration-100",
                    isSelected
                      ? "bg-[var(--brand-color)] text-white font-semibold shadow-sm"
                      : isToday
                      ? "ring-2 ring-[var(--brand-color)] text-[var(--brand-color)] dark:text-[#93c5fd] font-bold"
                      : "text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#253551]"
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
