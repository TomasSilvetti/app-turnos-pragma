"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
};

/** Formatea solo la parte entera con puntos de miles. Preserva la coma decimal si el usuario la está escribiendo. */
function formatDisplay(raw: string): string {
  // Separar parte entera de la decimal (si existe)
  const [intPart, decPart] = raw.split(",");
  const digits = intPart.replace(/\D/g, "");
  if (!digits) return decPart !== undefined ? "," + decPart : "";
  const intFormatted = Number(digits).toLocaleString("es-AR", { maximumFractionDigits: 0 });
  return decPart !== undefined ? intFormatted + "," + decPart : intFormatted;
}

function parseDisplay(formatted: string): number | undefined {
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? undefined : n;
}

export function NumericInput({ id, value, onChange, placeholder, disabled, hasError, className, ...rest }: Props) {
  const [display, setDisplay] = useState<string>(
    value != null ? value.toLocaleString("es-AR", { maximumFractionDigits: 2 }) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Resetear cuando el valor se limpia desde afuera (ej: después de submit)
  useEffect(() => {
    if (value == null) setDisplay("");
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Bloquear cualquier carácter que no sea dígito, punto o coma
    if (/[^0-9.,]/.test(raw)) return;

    // Máximo una coma
    const commas = (raw.match(/,/g) ?? []).length;
    if (commas > 1) return;

    // Si el usuario está borrando y llega a vacío
    if (raw === "" || raw === ",") {
      setDisplay(raw);
      onChange(undefined);
      return;
    }

    // Extraer solo los dígitos + coma para reformatear
    const [intRaw, decRaw] = raw.split(",");
    const intDigits = intRaw.replace(/\D/g, "");

    let formatted: string;
    if (!intDigits && raw.startsWith(",")) {
      formatted = raw; // empieza con coma, dejar pasar
    } else {
      const intFormatted = intDigits
        ? Number(intDigits).toLocaleString("es-AR", { maximumFractionDigits: 0 })
        : "";
      formatted = decRaw !== undefined ? intFormatted + "," + decRaw : intFormatted;
    }

    setDisplay(formatted);
    onChange(parseDisplay(formatted));
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] dark:text-white placeholder:text-slate-400 outline-none transition-colors",
        "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
        hasError ? "border-red-400" : "border-[#E0E0DB]",
        className
      )}
      {...rest}
    />
  );
}
