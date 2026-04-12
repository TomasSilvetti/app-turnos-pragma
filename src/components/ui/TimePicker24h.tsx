"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TimePicker24hProps {
  id?: string;
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  hasError?: boolean;
  dropdownAlign?: "left" | "right";
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export function TimePicker24h({ id, value, onChange, hasError, dropdownAlign = "left" }: TimePicker24hProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  const [selectedHour, selectedMinute] = value ? value.split(":") : ["", ""];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Scroll selected item into center when opening
  useEffect(() => {
    if (!open) return;
    const ITEM_H = 36;
    if (hourRef.current && selectedHour) {
      const idx = HOURS.indexOf(selectedHour);
      if (idx !== -1) hourRef.current.scrollTop = idx * ITEM_H - ITEM_H * 2;
    }
    if (minuteRef.current && selectedMinute) {
      const idx = MINUTES.indexOf(selectedMinute);
      if (idx !== -1) minuteRef.current.scrollTop = idx * ITEM_H - ITEM_H * 2;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectHour(h: string) {
    const min = selectedMinute || "00";
    onChange(`${h}:${min}`);
  }

  function selectMinute(m: string) {
    const hr = selectedHour || "00";
    onChange(`${hr}:${m}`);
  }

  const displayValue = value || "--:--";

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger input */}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors outline-none",
          "focus:ring-2 focus:ring-[var(--brand-color)]/30",
          hasError ? "border-[#ef4444]" : "border-[#E0E0DB]",
          value ? "text-[#2A2829] dark:text-[#e2e8f0]" : "text-[#2A2829]/40 dark:text-[#94a3b8]/60"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-mono tracking-widest">{displayValue}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-[#2A2829]/40 dark:text-[#94a3b8]/60"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn("absolute z-50 mt-1.5 w-52 rounded-xl border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] shadow-lg overflow-hidden", dropdownAlign === "right" ? "right-0" : "left-0")}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E0E0DB] dark:border-[#2d3548] px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-color)]/60">
              Hora (24h)
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--brand-color)]">
              {value || "--:--"}
            </span>
          </div>

          {/* Columns */}
          <div className="flex">
            {/* Hours column */}
            <div className="flex-1 border-r border-[#E0E0DB] dark:border-[#2d3548]">
              <div className="border-b border-[#E0E0DB] dark:border-[#2d3548] py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#2A2829]/40 dark:text-[#64748b]">
                HH
              </div>
              <div
                ref={hourRef}
                className="h-[160px] overflow-y-auto scroll-smooth"
                style={{ scrollbarWidth: "none" }}
                role="listbox"
                aria-label="Horas"
              >
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    role="option"
                    aria-selected={h === selectedHour}
                    onClick={() => selectHour(h)}
                    className={cn(
                      "flex h-9 w-full items-center justify-center font-mono text-sm transition-colors",
                      h === selectedHour
                        ? "bg-[var(--brand-color)] text-white font-semibold"
                        : "text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548]"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes column */}
            <div className="flex-1">
              <div className="border-b border-[#E0E0DB] dark:border-[#2d3548] py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#2A2829]/40 dark:text-[#64748b]">
                MM
              </div>
              <div
                ref={minuteRef}
                className="h-[160px] overflow-y-auto scroll-smooth"
                style={{ scrollbarWidth: "none" }}
                role="listbox"
                aria-label="Minutos"
              >
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="option"
                    aria-selected={m === selectedMinute}
                    onClick={() => {
                      selectMinute(m);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-9 w-full items-center justify-center font-mono text-sm transition-colors",
                      m === selectedMinute
                        ? "bg-[var(--brand-color)] text-white font-semibold"
                        : "text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548]"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#E0E0DB] dark:border-[#2d3548] px-3 py-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1 text-xs font-medium text-white bg-[var(--brand-color)] hover:bg-[#1c2a40] transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
