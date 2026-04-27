"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  isDark?: boolean;
};

export function CustomSelect({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  hasError,
  className,
  isDark = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onBlur]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      onBlur?.();
    }
  }

  return (
    <div ref={ref} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUpward(spaceBelow < 220);
          }
          setOpen((v) => !v);
        }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors",
          isDark ? "bg-[#101827] text-white/90" : "bg-white dark:bg-[#0c1220] text-[#2A2829] dark:text-[#e2e8f0]",
          hasError
            ? "border-[#ef4444]"
            : open
            ? "border-[var(--brand-color)] ring-2 ring-[var(--brand-color)]/15"
            : isDark
            ? "border-white/10 hover:border-white/20"
            : "border-[#E0E0DB] dark:border-[#1a2840] hover:border-[#c0c0ba] dark:hover:border-[#3d4a60]"
        )}
      >
        <span className={cn(!selected && (isDark ? "text-white/30" : "text-[#2A2829]/40 dark:text-[#94a3b8]"))}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-transform duration-150",
            open && "rotate-180",
            "text-[#2A2829]/40 dark:text-[#94a3b8]"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-50 w-full rounded-xl border shadow-lg overflow-y-auto py-1",
            "max-h-52",
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5",
            isDark ? "bg-[#101827] border-white/10" : "bg-white dark:bg-[#0c1220] border-[#E0E0DB] dark:border-[#1a2840]"
          )}
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={value === option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  onBlur?.();
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm transition-colors",
                  isDark ? "text-white/90" : "text-[#2A2829] dark:text-[#e2e8f0]",
                  value === option.value
                    ? "bg-[var(--brand-color)]/10 dark:bg-[var(--brand-color)]/20 font-medium text-[var(--brand-color)] dark:text-[var(--brand-color)]"
                    : isDark
                    ? "hover:bg-white/5"
                    : "hover:bg-[#f5f5f3] dark:hover:bg-[#253551]"
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
