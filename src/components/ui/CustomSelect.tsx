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
}: Props) {
  const [open, setOpen] = useState(false);
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
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors",
          "bg-white dark:bg-[#1e293b]",
          "text-[#2A2829] dark:text-[#e2e8f0]",
          hasError
            ? "border-[#ef4444]"
            : open
            ? "border-[var(--brand-color)] ring-2 ring-[var(--brand-color)]/15"
            : "border-[#E0E0DB] dark:border-[#2d3548] hover:border-[#c0c0ba] dark:hover:border-[#3d4a60]"
        )}
      >
        <span className={cn(!selected && "text-[#2A2829]/40 dark:text-[#94a3b8]")}>
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
            "absolute z-50 mt-1.5 w-full rounded-xl border shadow-lg overflow-hidden py-1",
            "bg-white dark:bg-[#1e293b]",
            "border-[#E0E0DB] dark:border-[#2d3548]"
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
                  "text-[#2A2829] dark:text-[#e2e8f0]",
                  value === option.value
                    ? "bg-[var(--brand-color)]/10 dark:bg-[var(--brand-color)]/20 font-medium text-[var(--brand-color)] dark:text-[var(--brand-color)]"
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
