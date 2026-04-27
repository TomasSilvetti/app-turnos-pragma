"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void; // YYYY-MM-DD
  className?: string;
};

function toDisplay(v: string): string {
  if (!v) return "";
  const [y, m, d] = v.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
}

function toInternal(v: string): string {
  const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function DateInput({ value, onChange, className }: Props) {
  const [display, setDisplay] = useState(toDisplay(value));

  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDisplay(raw);
    if (raw === "") {
      onChange("");
      return;
    }
    const internal = toInternal(raw);
    if (internal) onChange(internal);
  }

  return (
    <input
      type="text"
      value={display}
      onChange={handleChange}
      placeholder="dd/mm/yyyy"
      maxLength={10}
      className={cn(
        "rounded-md border border-[#E0E0DB] dark:border-[#1a2840]",
        "bg-white dark:bg-[#0c1220] text-sm text-[#2A2829] dark:text-[#e2e8f0]",
        "px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-color)]",
        "placeholder:text-[#2A2829]/40 dark:placeholder:text-[#94a3b8]",
        className
      )}
    />
  );
}
