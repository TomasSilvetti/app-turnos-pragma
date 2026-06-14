import { useCallback, useEffect, useRef, useState } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Target } from "lucide-react";
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
  const longPressed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const incrementar = useCallback(async () => {
    if (!progressId || !data) return;
    // Optimista
    const tope = data.hasGoal && data.goal != null ? data.goal : Infinity;
    const nuevo = Math.min(data.count + 1, tope);
    setData({ ...data, count: nuevo });
    const res = await notasFetch(`/api/notas/progress/${progressId}`, {
      method: "PATCH",
      body: JSON.stringify({ delta: 1 }),
    });
    if (res.ok) {
      const { progress } = await res.json();
      setData(progress);
    }
  }, [progressId, data]);

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
    if (!longPressed.current) incrementar();
  };

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
        title="Click para sumar · mantené presionado para editar"
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
            {(data?.count ?? 0) === 0 && (
              <span className="text-xs text-muted-foreground">Tocá para sumar el primero</span>
            )}
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
