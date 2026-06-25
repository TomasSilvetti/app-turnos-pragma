"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  titulo: string;
  valorInicial: string;
  onConfirmar: (nombre: string) => void;
  onCerrar: () => void;
};

export function RenombrarModal({ open, titulo, valorInicial, onConfirmar, onCerrar }: Props) {
  const [valor, setValor] = useState(valorInicial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValor(valorInicial);
      // Foco + selección del texto al abrir.
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [open, valorInicial]);

  if (!open || typeof document === "undefined") return null;

  const confirmar = () => {
    const nombre = valor.trim();
    if (nombre) onConfirmar(nombre);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <Pencil className="size-4 text-primary" /> {titulo}
          </h3>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <input
          ref={inputRef}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmar();
            if (e.key === "Escape") onCerrar();
          }}
          placeholder="Nuevo nombre"
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button size="sm" onClick={confirmar} disabled={!valor.trim()}>
            Guardar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
