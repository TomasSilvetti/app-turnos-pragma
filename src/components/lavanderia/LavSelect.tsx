"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type LavOption = { value: string; label: string };

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: LavOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
};

export function LavSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  className,
  triggerClassName,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setOpenUpward(window.innerHeight - rect.bottom < 240);
          }
          setOpen((v) => !v);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm outline-none transition-colors",
          open ? "border-primary" : "border-border hover:border-primary/50",
          triggerClassName
        )}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            "absolute z-50 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg",
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={value === option.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm transition-colors",
                  value === option.value
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-popover-foreground hover:bg-muted"
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
