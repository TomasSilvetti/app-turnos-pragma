"use client";

// Effects que sincronizan con sistemas externos (URL, fetch de la nota).
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { EditorToolbar } from "@/components/notas/EditorToolbar";
import { NotaEditor } from "@/components/notas/NotaEditor";

type NotaFull = { id: string; title: string; content: object };

export default function NotaEditorPage() {
  const params = useParams<{ id: string }>();
  const notaId = params.id;
  const router = useRouter();
  const { ready, deviceId } = useNotaDevice();

  const [nota, setNota] = useState<NotaFull | null>(null);
  const [title, setTitle] = useState("");
  const [estado, setEstado] = useState<"cargando" | "ok" | "404">("cargando");
  const [focusReminderId, setFocusReminderId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Deep-link: ?reminder=<id> (sin useSearchParams para no requerir Suspense en build).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setFocusReminderId(sp.get("reminder"));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!deviceId) { setEstado("404"); return; }
    notasFetch(`/api/notas/${notaId}`)
      .then((r) => {
        if (r.status === 404) {
          setEstado("404");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d: { nota: NotaFull } | null) => {
        if (!d) return;
        setNota(d.nota);
        setTitle(d.nota.title ?? "");
        setEstado("ok");
      })
      .catch(() => setEstado("404"));
  }, [ready, deviceId, notaId]);

  const onTitleChange = (value: string) => {
    setTitle(value);
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      notasFetch(`/api/notas/${notaId}`, { method: "PUT", body: JSON.stringify({ title: value }) }).catch(() => {});
    }, 600);
  };

  const eliminarNota = async () => {
    if (!confirm("¿Eliminar esta nota? No se puede deshacer.")) return;
    await notasFetch(`/api/notas/${notaId}`, { method: "DELETE" });
    router.push("/notas");
  };

  const onEditorReady = useCallback((e: Editor | null) => setEditor(e), []);

  if (estado === "cargando") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (estado === "404") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-muted-foreground">No encontramos esta nota.</p>
        <Button onClick={() => router.push("/notas")}>Volver a mis notas</Button>
      </div>
    );
  }

  return (
    // Barra superior fija: título + toolbar de estilos.
    // El contenido del editor tiene padding-top para que no quede debajo.
    <>
      <div className="fixed inset-x-0 top-0 z-30 overflow-hidden border-b border-border bg-card shadow-sm">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Fila 1: navegación y título */}
          <div className="flex items-center gap-2 py-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/notas")} aria-label="Volver">
              <ArrowLeft />
            </Button>
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Título de la nota"
              className="flex-1 bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/60"
            />
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={eliminarNota} aria-label="Eliminar nota">
              <Trash2 />
            </Button>
          </div>
          {/* Fila 2: toolbar de estilos (siempre visible) */}
          <div className="border-t border-border/60">
            {editor && <EditorToolbar editor={editor} />}
          </div>
        </div>
      </div>

      {/* Área de contenido con espacio para la barra fija (~fila1 ~44px + ~fila2 ~40px = ~84px) */}
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-[88px] sm:px-6">
        {nota && (
          <NotaEditor
            notaId={nota.id}
            initialContent={nota.content}
            focusReminderId={focusReminderId}
            onEditorReady={onEditorReady}
          />
        )}
      </div>
    </>
  );
}
