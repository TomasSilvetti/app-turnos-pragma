"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Loader2 } from "lucide-react";
import { notasFetch } from "@/lib/notas/client";
import {
  archivoAImagenComprimida,
  esImagen,
  imagenesDelEvento,
  manejarPegadoDeImagenes,
} from "@/lib/notas/imagen";
import { NotaImage } from "@/components/notas/editor/notaImage";
import { EditorToolbar } from "@/components/notas/EditorToolbar";

// Editor del prompt de trabajo: lo mismo que una nota, con una diferencia que
// importa. Las imágenes NO se guardan como data URL adentro del documento: van a
// Vercel Blob y el nodo se queda con la URL. Un prompt con cuatro capturas
// embebidas serían megabytes viajando en cada autosave, y además el harness
// necesita poder descargarlas por separado para armar su prompt.

const PLACEHOLDER =
  "Describí qué hay que hacer. Numerá los pasos (1., 2., 3.) para que la barra de progreso pueda avanzar.";

function nuevoId(): string {
  return `loc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function PromptEditor({
  itemId,
  promptId,
  bandejaId,
  contenidoInicial,
  editable = true,
  placeholder = PLACEHOLDER,
  onGuardado,
  extensiones = [],
  onEditor,
}: {
  itemId?: string;
  promptId?: string;
  // La bandeja usa el mismo editor con otro destino: su contenido se guarda en
  // la bandeja y sus imágenes cuelgan de ella hasta que se confirme un ítem.
  bandejaId?: string;
  contenidoInicial: object;
  editable?: boolean;
  placeholder?: string;
  onGuardado?: () => void;
  extensiones?: Extensions;
  onEditor?: (editor: Editor | null) => void;
}) {
  const [estado, setEstado] = useState<"idle" | "saving" | "saved">("idle");
  const [subiendo, setSubiendo] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<Editor | null>(null);

  const guardar = useCallback(
    (contenido: object) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setEstado("saving");
      saveTimer.current = setTimeout(async () => {
        const url = bandejaId ? "/api/notas/trabajo/bandeja" : `/api/notas/trabajo/prompts/${promptId}`;
        await notasFetch(url, { method: "PUT", body: JSON.stringify({ contenido }) }).catch(() => {});
        setEstado("saved");
        onGuardado?.();
      }, 800);
    },
    [promptId, bandejaId, onGuardado]
  );

  // La imagen se comprime en el navegador igual que en las notas, y recién
  // después se sube: lo que llega al store ya es un WebP de ~150 KB y no la foto
  // de 4 MB que salió de la cámara.
  const subirImagenes = useCallback(
    async (files: File[]) => {
      const editor = editorRef.current;
      if (!editor || files.length === 0) return;
      setSubiendo(true);
      try {
        for (const file of files) {
          if (!esImagen(file)) continue;
          const dataUrl = await archivoAImagenComprimida(file);
          const blob = await fetch(dataUrl).then((r) => r.blob());

          const form = new FormData();
          form.append("file", new File([blob], "captura.webp", { type: blob.type }));
          if (bandejaId) form.append("bandejaId", bandejaId);
          if (itemId) form.append("itemId", itemId);
          if (promptId) form.append("promptId", promptId);

          const res = await notasFetch("/api/notas/trabajo/imagenes", { method: "POST", body: form });
          if (!res.ok) continue;
          const { imagen } = await res.json();
          editor
            .chain()
            .focus()
            .insertContent({ type: "notaImage", attrs: { imgId: nuevoId(), src: imagen.url, width: 100 } })
            .run();
        }
      } finally {
        setSubiendo(false);
      }
    },
    [itemId, promptId, bandejaId]
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
      // El recorte necesita el modal de la página de notas; acá se sube la
      // imagen ya recortada desde el celular, así que el botón queda inerte.
      NotaImage.configure({ onCrop: () => {} }),
      ...extensiones,
    ],
    content: contenidoInicial,
    editorProps: {
      attributes: { class: "notas-prose focus:outline-none min-h-[6rem] px-3 py-2 text-sm" },
      handlePaste: (_view, event) => {
        const atendido = manejarPegadoDeImagenes(event.clipboardData, (files) => subirImagenes(files));
        if (atendido) event.preventDefault();
        return atendido;
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false;
        const imagenes = imagenesDelEvento(event.dataTransfer);
        if (imagenes.length === 0) return false;
        event.preventDefault();
        subirImagenes(imagenes);
        return true;
      },
    },
    onUpdate: ({ editor }) => guardar(editor.getJSON()),
  });

  useEffect(() => {
    editorRef.current = editor;
    onEditor?.(editor);
  }, [editor, onEditor]);

  return (
    <div className="rounded-lg border border-border bg-background">
      {editable && editor && (
        <div className="border-b border-border/60">
          <EditorToolbar editor={editor} onInsertImage={() => fileRef.current?.click()} />
        </div>
      )}
      <div className="relative">
        <EditorContent editor={editor} />
        {(estado !== "idle" || subiendo) && (
          <span className="pointer-events-none absolute right-2 top-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            {subiendo && <Loader2 className="size-3 animate-spin" />}
            {subiendo ? "Subiendo imagen…" : estado === "saving" ? "Guardando…" : "Guardado"}
          </span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) subirImagenes(files);
        }}
      />
    </div>
  );
}
