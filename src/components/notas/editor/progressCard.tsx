import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Check, Target, X } from "lucide-react";
import { notasFetch } from "@/lib/notas/client";
import { dotColor } from "./colors";

export type ProgressCardOptions = { onEdit: (progressId: string) => void };

export type ProgressData = {
  id: string;
  hasGoal: boolean;
  goal: number | null;
  count: number;
  label: string;
  color: string;
};

// Evento para sincronizar la card cuando se edita desde el modal del editor.
export const PROGRESS_UPDATED_EVENT = "notas:progress-updated";

const LONG_PRESS_MS = 450;

function ProgressCardView({ node, extension }: NodeViewProps) {
  const progressId = node.attrs.progressId as string | null;
  const onEdit = (extension.options as ProgressCardOptions).onEdit;

  const [data, setData] = useState<ProgressData | null>(null);
  const [composing, setComposing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const longPressed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!progressId) return;
    notasFetch(`/api/notas/progress/${progressId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { progress: ProgressData } | null) => d && setData(d.progress))
      .catch(() => {});
  }, [progressId]);

  useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<ProgressData>).detail;
      if (detail && detail.id === progressId) setData(detail);
    };
    window.addEventListener(PROGRESS_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PROGRESS_UPDATED_EVENT, onUpdated);
  }, [progressId]);

  // Foco automático al abrir el compositor de la mini nota.
  useEffect(() => {
    if (composing) inputRef.current?.focus();
  }, [composing]);

  const tope = data?.hasGoal && data.goal != null ? data.goal : Infinity;
  const lleno = (data?.count ?? 0) >= tope;

  // Registra el toque: crea la mini nota (texto opcional) y suma el puntito.
  const agregarNota = useCallback(async () => {
    if (!progressId || !data || saving) return;
    setSaving(true);
    const res = await notasFetch(`/api/notas/progress/${progressId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text: noteText.trim() }),
    });
    if (res.ok) {
      const { progress } = await res.json();
      if (progress) setData(progress);
    }
    setSaving(false);
    setNoteText("");
    setComposing(false);
  }, [progressId, data, noteText, saving]);

  const cancelarNota = () => {
    setNoteText("");
    setComposing(false);
  };

  const onPointerDown = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      if (progressId) onEdit(progressId);
    }, LONG_PRESS_MS);
  };
  const limpiar = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const onPointerUp = () => {
    limpiar();
    if (!longPressed.current && !composing && !lleno) setComposing(true);
  };

  // Evita que los toques dentro del compositor disparen el contador / long-press.
  const stop = (e: PointerEvent) => e.stopPropagation();

  const pct = data && data.hasGoal && data.goal ? Math.min(100, Math.round((data.count / data.goal) * 100)) : 0;

  return (
    <NodeViewWrapper className="my-2">
      <div
        contentEditable={false}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={limpiar}
        role="button"
        tabIndex={0}
        title="Tocá para sumar y agregar una mini nota · mantené presionado para editar"
        className="w-full cursor-pointer select-none rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            {data?.hasGoal && <Target className="size-3.5 text-primary" />}
            {data?.label?.trim() || (data?.hasGoal ? "Objetivo" : "Contador")}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {!data ? "…" : data.hasGoal ? `${data.count}/${data.goal} · ${pct}%` : data.count}
          </span>
        </div>

        {data?.hasGoal ? (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: data.color || "var(--color-primary)" }}
            />
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: data?.count ?? 0 }).map((_, i) => (
              <span
                key={i}
                className="size-3 rounded-full"
                style={{ backgroundColor: dotColor(i) }}
              />
            ))}
            {(data?.count ?? 0) === 0 && !composing && (
              <span className="text-xs text-muted-foreground">Tocá para sumar el primero</span>
            )}
          </div>
        )}

        {composing && (
          <div
            className="mt-3 flex items-center gap-2"
            onPointerDown={stop}
            onPointerUp={stop}
            onPointerLeave={stop}
          >
            <input
              ref={inputRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarNota();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelarNota();
                }
              }}
              placeholder="Mini nota (opcional)…"
              maxLength={280}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={agregarNota}
              disabled={saving}
              aria-label="Agregar"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              onClick={cancelarNota}
              aria-label="Cancelar"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ProgressCard = Node.create<ProgressCardOptions>({
  name: "progressCard",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { onEdit: () => {} };
  },

  addAttributes() {
    return { progressId: { default: null } };
  },

  parseHTML() {
    return [{ tag: "div[data-progress-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-progress-id": HTMLAttributes.progressId })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ProgressCardView);
  },
});
