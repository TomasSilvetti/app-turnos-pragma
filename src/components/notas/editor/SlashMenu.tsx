"use client";

// El effect resetea la fila seleccionada cuando cambia la lista filtrada
// (sincroniza prop → estado): el setState es intencional.
/* eslint-disable react-hooks/set-state-in-effect */

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Bell, ImagePlus, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlashItem = {
  id: "recordatorio" | "progreso" | "imagen";
  title: string;
  description: string;
  keywords: string[];
};

export const SLASH_ITEMS: SlashItem[] = [
  {
    id: "recordatorio",
    title: "Recordatorio",
    description: "Programá un aviso con notificación",
    keywords: ["recordatorio", "aviso", "alarma", "reminder", "notificacion"],
  },
  {
    id: "progreso",
    title: "Progreso",
    description: "Contador u objetivo a seguir",
    keywords: ["progreso", "contador", "objetivo", "habito", "meta"],
  },
  {
    id: "imagen",
    title: "Imagen",
    description: "Subí una imagen (o pegala con Ctrl+V)",
    keywords: ["imagen", "foto", "captura", "screenshot", "picture", "img"],
  },
];

const ICONS: Record<SlashItem["id"], React.ReactNode> = {
  recordatorio: <Bell className="size-4" />,
  progreso: <Target className="size-4" />,
  imagen: <ImagePlus className="size-4" />,
};

export type SlashMenuRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type SlashMenuProps = {
  items: SlashItem[];
  command: (item: SlashItem) => void;
};

// Menú que aparece al escribir "/". Navegable con teclado (↑ ↓ Enter) y mouse.
export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(function SlashMenu({ items, command }, ref) {
  const [selected, setSelected] = useState(0);

  // Resetear la selección si cambia la lista (al filtrar mientras se escribe).
  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (items.length === 0) return false;
      if (event.key === "ArrowUp") {
        setSelected((s) => (s + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-64 rounded-xl border border-border bg-popover p-2 text-sm text-muted-foreground shadow-xl">
        Sin comandos
      </div>
    );
  }

  return (
    <div className="w-64 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setSelected(i)}
          onClick={() => command(item)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
            i === selected ? "bg-primary/10" : "hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              i === selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
            )}
          >
            {ICONS[item.id]}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});
