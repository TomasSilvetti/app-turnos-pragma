"use client";

// El effect resetea el formulario cuando se abre el modal (sincroniza props→estado).
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { notasFetch } from "@/lib/notas/client";
import { Modal } from "./Modal";
import { dotColor } from "./editor/colors";
import { PROGRESS_UPDATED_EVENT } from "./editor/progressCard";

const COLORES = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#14b8a6"];

export type ProgressValues = { hasGoal: boolean; goal: number; label: string; color: string };

type MiniNota = { id: string; text: string; createdAt: string };

export function ProgressModal({
  open,
  mode,
  initial,
  progressId,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<ProgressValues>;
  progressId?: string;
  onClose: () => void;
  onSave: (v: ProgressValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [hasGoal, setHasGoal] = useState(false);
  const [goal, setGoal] = useState(10);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLORES[0]);
  const [guardando, setGuardando] = useState(false);
  const [notes, setNotes] = useState<MiniNota[]>([]);
  const [borrando, setBorrando] = useState<string | null>(null);
  // Mini notas expandidas (muestran el texto completo en vez de una línea).
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  const toggleExpandir = (noteId: string) =>
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });

  useEffect(() => {
    if (open) {
      setHasGoal(initial?.hasGoal ?? false);
      setGoal(initial?.goal ?? 10);
      setLabel(initial?.label ?? "");
      setColor(initial?.color ?? COLORES[0]);
      setGuardando(false);
    }
  }, [open, initial]);

  // Carga las mini notas del progreso al abrir el modal en modo edición.
  useEffect(() => {
    if (!open || mode !== "edit" || !progressId) {
      setNotes([]);
      return;
    }
    let activo = true;
    setExpandidas(new Set());
    notasFetch(`/api/notas/progress/${progressId}/notes`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { notes: MiniNota[] } | null) => {
        if (activo && d) setNotes(d.notes);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [open, mode, progressId]);

  const eliminarNota = async (noteId: string) => {
    if (borrando) return;
    setBorrando(noteId);
    const res = await notasFetch(`/api/notas/progress/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      const { progress } = await res.json().catch(() => ({ progress: null }));
      // Sincroniza la card: el puntito eliminado desaparece del contador.
      if (progress) window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: progress }));
    }
    setBorrando(null);
  };

  const guardar = async () => {
    setGuardando(true);
    await onSave({ hasGoal, goal: Math.max(1, goal), label: label.trim(), color });
    setGuardando(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "create" ? "Nuevo progreso" : "Editar progreso"}>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nombre (opcional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: vasos de agua"
            maxLength={120}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Toggle con/sin objetivo */}
        <div className="flex rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setHasGoal(false)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !hasGoal ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Contador
          </button>
          <button
            type="button"
            onClick={() => setHasGoal(true)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              hasGoal ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            Con objetivo
          </button>
        </div>

        {hasGoal ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Objetivo (cantidad de éxitos)</label>
            <input
              type="number"
              min={1}
              value={goal}
              onChange={(e) => setGoal(parseInt(e.target.value) || 1)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground">Muestra una barra de progreso en porcentaje.</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Suma puntitos de colores en cada click. Sin meta final.
          </p>
        )}

        {hasGoal && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Color de la barra</label>
            <div className="flex gap-2">
              {COLORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    color === c ? "scale-110 border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-2 border-t border-border pt-4">
            <label className="text-sm font-medium">Mini notas</label>
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Todavía no hay notas. Tocá el progreso para sumar un puntito y agregar una.
              </p>
            ) : (
              <ul className="max-h-60 space-y-1.5 overflow-y-auto">
                {notes.map((n, i) => {
                  const abierta = expandidas.has(n.id);
                  return (
                  <li
                    key={n.id}
                    className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span
                      className="mt-0.5 size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: hasGoal ? color : dotColor(i) }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpandir(n.id)}
                      className={cn(
                        "min-w-0 flex-1 cursor-pointer text-left text-sm",
                        abierta ? "whitespace-pre-wrap break-words" : "truncate",
                        !n.text.trim() && "text-muted-foreground"
                      )}
                      title={abierta ? "Tocá para contraer" : "Tocá para ver la nota completa"}
                    >
                      {n.text.trim() || "Sin nota"}
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarNota(n.id)}
                      disabled={borrando === n.id}
                      aria-label="Eliminar nota"
                      className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {mode === "edit" && onDelete ? (
            <Button variant="destructive" size="icon" onClick={onDelete} aria-label="Eliminar progreso">
              <Trash2 />
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
