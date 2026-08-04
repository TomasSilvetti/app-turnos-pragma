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
import { NotaImage, INSERT_IMAGE_EVENT } from "./editor/notaImage";
import { ReminderModal, type ReminderValues } from "./ReminderModal";
import { ProgressModal, type ProgressValues } from "./ProgressModal";
import { ImageCropModal } from "./ImageCropModal";
import {
  archivoAImagenComprimida,
  esImagen,
  imagenesDelEvento,
  manejarPegadoDeImagenes,
} from "@/lib/notas/imagen";

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

type CropModalState = { open: boolean; imgId?: string; src?: string };

type NodeHit = { pos: number; size: number; attrs: Record<string, unknown> };

function nuevoId(): string {
  return `loc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

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
  const [cropModal, setCropModal] = useState<CropModalState>({ open: false });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const insertPosRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Inserta imágenes ya comprimidas como data URL: quedan dentro del JSON de la
  // nota, así el espejo local sigue mostrándolas sin conexión.
  const insertarImagenes = useCallback(async (files: File[], pos?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    for (const file of files) {
      if (!esImagen(file)) continue;
      try {
        const src = await archivoAImagenComprimida(file);
        const chain = editor.chain();
        if (pos !== undefined) chain.setTextSelection(pos);
        else chain.focus();
        chain.insertContent({ type: "notaImage", attrs: { imgId: nuevoId(), src, width: 100 } }).run();
      } catch {
        // Un archivo ilegible no debe cortar el resto del pegado.
      }
    }
  }, []);

  const onSlashCommand = useCallback((cmd: SlashCommandType) => {
    insertPosRef.current = editorRef.current?.state.selection.from ?? null;
    if (cmd === "recordatorio") setReminderModal({ open: true, mode: "create" });
    else if (cmd === "imagen") fileInputRef.current?.click();
    else setProgressModal({ open: true, mode: "create" });
  }, []);

  const onCropImagen = useCallback((imgId: string, src: string) => {
    setCropModal({ open: true, imgId, src });
  }, []);

  const aplicarRecorte = useCallback(
    (nuevoSrc: string) => {
      const editor = editorRef.current;
      const imgId = cropModal.imgId;
      if (editor && imgId) {
        const info = findNode(editor, "notaImage", "imgId", imgId);
        if (info) {
          const pos = info.pos;
          editor
            .chain()
            .command(({ tr }) => {
              tr.setNodeAttribute(pos, "src", nuevoSrc);
              return true;
            })
            .run();
        }
      }
      setCropModal({ open: false });
    },
    [cropModal.imgId]
  );

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
      NotaImage.configure({ onCrop: onCropImagen }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: "notas-prose focus:outline-none min-h-[60vh] px-4 py-4" },
      // Pegar captura / imagen del portapapeles.
      handlePaste: (_view, event) => {
        const atendido = manejarPegadoDeImagenes(event.clipboardData, (files) => insertarImagenes(files));
        if (atendido) event.preventDefault();
        return atendido;
      },
      // Arrastrar y soltar archivos de imagen sobre el editor.
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const imagenes = imagenesDelEvento(event.dataTransfer);
        if (imagenes.length === 0) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        insertarImagenes(imagenes, coords?.pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => guardarContenido(editor.getJSON()),
  });

  useEffect(() => {
    editorRef.current = editor;
    onEditorReady?.(editor);
  }, [editor, onEditorReady]);

  // Botón "Imagen" de la toolbar fija de la página.
  useEffect(() => {
    const abrirSelector = () => {
      insertPosRef.current = editorRef.current?.state.selection.from ?? null;
      fileInputRef.current?.click();
    };
    window.addEventListener(INSERT_IMAGE_EVENT, abrirSelector);
    return () => window.removeEventListener(INSERT_IMAGE_EVENT, abrirSelector);
  }, []);

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
      // Id generado en el cliente: la card se inserta con los valores ingresados
      // sin depender de la respuesta del servidor, así también funciona offline.
      const id = `loc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
      notasFetch(`/api/notas/${notaId}/reminders`, {
        method: "POST",
        body: JSON.stringify({ id, ...v }),
      }).catch(() => {});

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
            reminderId: id,
            time: v.time,
            days: v.daysOfWeek,
            text: v.text,
            interval: v.intervalMinutes ?? null,
            endTime: v.endTime ?? "",
          },
        })
        .insertContent(" ")
        .run();
      insertPosRef.current = null;
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
      // Id del cliente: se inserta la card sin depender de la respuesta (offline OK).
      const id = `loc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
      notasFetch(`/api/notas/${notaId}/progress`, {
        method: "POST",
        body: JSON.stringify({ id, ...v }),
      }).catch(() => {});

      const savedPos = insertPosRef.current;
      const chain = editor.chain();
      if (savedPos !== null) {
        chain.setTextSelection(savedPos);
      } else {
        chain.focus();
      }
      chain.insertContent({ type: "progressCard", attrs: { progressId: id } }).run();
      insertPosRef.current = null;
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) insertarImagenes(files, insertPosRef.current ?? undefined);
          insertPosRef.current = null;
        }}
      />

      <ImageCropModal
        open={cropModal.open}
        src={cropModal.src ?? null}
        onClose={() => setCropModal({ open: false })}
        onApply={aplicarRecorte}
      />

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
