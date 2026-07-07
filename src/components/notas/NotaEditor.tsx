"use client";

// editorRef se usa dentro de callbacks que se pasan a las extensiones al crear
// el editor (chicken-and-egg): el ref es la forma correcta de romper ese ciclo.
/* eslint-disable react-hooks/refs */

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extension-placeholder";
import { notasFetch } from "@/lib/notas/client";
import { parchearNotaLocal } from "@/lib/notas/notasLocal";
import { SlashCommands, type SlashCommandType } from "./editor/slashCommands";
import { ReminderChip } from "./editor/reminderChip";
import { ProgressCard, PROGRESS_UPDATED_EVENT } from "./editor/progressCard";
import { ReminderModal, type ReminderValues } from "./ReminderModal";
import { ProgressModal, type ProgressValues } from "./ProgressModal";

type Estado = "idle" | "saving" | "saved";

type ReminderModalState = {
  open: boolean;
  mode: "create" | "edit";
  reminderId?: string;
  initial?: ReminderValues;
};
type ProgressModalState = {
  open: boolean;
  mode: "create" | "edit";
  progressId?: string;
  initial?: Partial<ProgressValues>;
};

type NodeHit = { pos: number; size: number; attrs: Record<string, unknown> };

function findNode(editor: Editor, name: string, attr: string, id: string): NodeHit | null {
  let res: NodeHit | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (res) return false;
    if (node.type.name === name && node.attrs[attr] === id) {
      res = { pos, size: node.nodeSize, attrs: node.attrs };
      return false;
    }
    return true;
  });
  return res;
}

export function NotaEditor({
  notaId,
  initialContent,
  focusReminderId,
  onEditorReady,
}: {
  notaId: string;
  initialContent: object;
  focusReminderId?: string | null;
  onEditorReady?: (editor: Editor | null) => void;
}) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [reminderModal, setReminderModal] = useState<ReminderModalState>({ open: false, mode: "create" });
  const [progressModal, setProgressModal] = useState<ProgressModalState>({ open: false, mode: "create" });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const insertPosRef = useRef<number | null>(null);

  const guardarContenido = useCallback(
    (content: object) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setEstado("saving");
      // Espejo local inmediato: el contenido queda disponible offline.
      parchearNotaLocal(notaId, { content, updatedAt: new Date().toISOString() });
      saveTimer.current = setTimeout(async () => {
        await notasFetch(`/api/notas/${notaId}`, {
          method: "PUT",
          body: JSON.stringify({ content }),
        }).catch(() => {});
        setEstado("saved");
      }, 800);
    },
    [notaId]
  );

  const onSlashCommand = useCallback((cmd: SlashCommandType) => {
    insertPosRef.current = editorRef.current?.state.selection.from ?? null;
    if (cmd === "recordatorio") setReminderModal({ open: true, mode: "create" });
    else setProgressModal({ open: true, mode: "create" });
  }, []);

  const onEditReminder = useCallback((reminderId: string) => {
    const info = editorRef.current && findNode(editorRef.current, "reminderChip", "reminderId", reminderId);
    if (!info) return;
    setReminderModal({
      open: true,
      mode: "edit",
      reminderId,
      initial: {
        time: (info.attrs.time as string) || "09:00",
        daysOfWeek: (info.attrs.days as number[]) || [],
        text: (info.attrs.text as string) || "",
        intervalMinutes: (info.attrs.interval as number | null) ?? null,
        endTime: (info.attrs.endTime as string) || "",
      },
    });
  }, []);

  const onEditProgress = useCallback(async (progressId: string) => {
    const res = await notasFetch(`/api/notas/progress/${progressId}`);
    if (!res.ok) return;
    const { progress } = await res.json();
    setProgressModal({
      open: true,
      mode: "edit",
      progressId,
      initial: { hasGoal: progress.hasGoal, goal: progress.goal ?? 10, label: progress.label, color: progress.color },
    });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder: "Escribí algo… escribí / para ver los comandos" }),
      SlashCommands.configure({ onCommand: onSlashCommand }),
      ReminderChip.configure({ onEdit: onEditReminder }),
      ProgressCard.configure({ onEdit: onEditProgress }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: "notas-prose focus:outline-none min-h-[60vh] px-4 py-4" },
    },
    onUpdate: ({ editor }) => guardarContenido(editor.getJSON()),
  });

  useEffect(() => {
    editorRef.current = editor;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // Deep-link: enfocar el recordatorio indicado por la notificación.
  useEffect(() => {
    if (!editor || !focusReminderId) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`reminder-${focusReminderId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("nota-deeplink-flash");
        setTimeout(() => el.classList.remove("nota-deeplink-flash"), 2400);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [editor, focusReminderId]);

  // ── Guardado de recordatorios ──
  const guardarReminder = async (v: ReminderValues) => {
    if (!editor) return;
    if (reminderModal.mode === "create") {
      const res = await notasFetch(`/api/notas/${notaId}/reminders`, {
        method: "POST",
        body: JSON.stringify(v),
      });
      if (res.ok) {
        const { reminder } = await res.json();
        const savedPos = insertPosRef.current;
        const chain = editor.chain();
        if (savedPos !== null) {
          chain.setTextSelection(savedPos);
        } else {
          chain.focus();
        }
        chain
          .insertContent({
            type: "reminderChip",
            attrs: {
              reminderId: reminder.id,
              time: reminder.time,
              days: reminder.daysOfWeek,
              text: reminder.text,
              interval: reminder.intervalMinutes ?? null,
              endTime: reminder.endTime ?? "",
            },
          })
          .insertContent(" ")
          .run();
        insertPosRef.current = null;
      }
    } else if (reminderModal.reminderId) {
      const id = reminderModal.reminderId;
      await notasFetch(`/api/notas/reminders/${id}`, { method: "PUT", body: JSON.stringify(v) });
      const info = findNode(editor, "reminderChip", "reminderId", id);
      if (info) {
        const pos = info.pos;
        editor
          .chain()
          .command(({ tr }) => {
            tr.setNodeAttribute(pos, "time", v.time);
            tr.setNodeAttribute(pos, "days", v.daysOfWeek);
            tr.setNodeAttribute(pos, "text", v.text);
            tr.setNodeAttribute(pos, "interval", v.intervalMinutes);
            tr.setNodeAttribute(pos, "endTime", v.endTime);
            return true;
          })
          .run();
      }
    }
    setReminderModal({ open: false, mode: "create" });
  };

  const eliminarReminder = async () => {
    if (!editor || !reminderModal.reminderId) return;
    const id = reminderModal.reminderId;
    await notasFetch(`/api/notas/reminders/${id}`, { method: "DELETE" });
    const info = findNode(editor, "reminderChip", "reminderId", id);
    if (info) {
      const { pos, size } = info;
      editor.chain().command(({ tr }) => {
        tr.delete(pos, pos + size);
        return true;
      }).run();
    }
    setReminderModal({ open: false, mode: "create" });
  };

  // ── Guardado de progresos ──
  const guardarProgress = async (v: ProgressValues) => {
    if (!editor) return;
    if (progressModal.mode === "create") {
      const res = await notasFetch(`/api/notas/${notaId}/progress`, {
        method: "POST",
        body: JSON.stringify(v),
      });
      if (res.ok) {
        const { progress } = await res.json();
        const savedPos = insertPosRef.current;
        const chain = editor.chain();
        if (savedPos !== null) {
          chain.setTextSelection(savedPos);
        } else {
          chain.focus();
        }
        chain.insertContent({ type: "progressCard", attrs: { progressId: progress.id } }).run();
        insertPosRef.current = null;
      }
    } else if (progressModal.progressId) {
      const res = await notasFetch(`/api/notas/progress/${progressModal.progressId}`, {
        method: "PUT",
        body: JSON.stringify(v),
      });
      if (res.ok) {
        const { progress } = await res.json();
        window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: progress }));
      }
    }
    setProgressModal({ open: false, mode: "create" });
  };

  const eliminarProgress = async () => {
    if (!editor || !progressModal.progressId) return;
    const id = progressModal.progressId;
    await notasFetch(`/api/notas/progress/${id}`, { method: "DELETE" });
    const info = findNode(editor, "progressCard", "progressId", id);
    if (info) {
      const { pos, size } = info;
      editor.chain().command(({ tr }) => {
        tr.delete(pos, pos + size);
        return true;
      }).run();
    }
    setProgressModal({ open: false, mode: "create" });
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="relative">
        <EditorContent editor={editor} />
        <span className="pointer-events-none absolute right-3 top-2 text-[11px] text-muted-foreground">
          {estado === "saving" ? "Guardando…" : estado === "saved" ? "Guardado" : ""}
        </span>
      </div>

      <ReminderModal
        open={reminderModal.open}
        mode={reminderModal.mode}
        initial={reminderModal.initial}
        onClose={() => setReminderModal({ open: false, mode: "create" })}
        onSave={guardarReminder}
        onDelete={reminderModal.mode === "edit" ? eliminarReminder : undefined}
      />
      <ProgressModal
        open={progressModal.open}
        mode={progressModal.mode}
        initial={progressModal.initial}
        progressId={progressModal.progressId}
        onClose={() => setProgressModal({ open: false, mode: "create" })}
        onSave={guardarProgress}
        onDelete={progressModal.mode === "edit" ? eliminarProgress : undefined}
      />
    </div>
  );
}
