"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Settings, Loader2, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { PushToggle } from "@/components/notas/PushToggle";
import { NotasSettings } from "@/components/notas/NotasSettings";

type NotaItem = { id: string; title: string; updatedAt: string };

export default function NotasListPage() {
  const router = useRouter();
  const { deviceId, ready, hasPassword, recuperar, establecerPassword } = useNotaDevice();
  const [notas, setNotas] = useState<NotaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [ajustes, setAjustes] = useState(false);
  const [avisoOculto, setAvisoOculto] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);

  const eliminarNota = async (e: MouseEvent, notaId: string) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta nota? No se puede deshacer.")) return;
    setBorrando(notaId);
    await notasFetch(`/api/notas/${notaId}`, { method: "DELETE" }).catch(() => {});
    setNotas((prev) => prev.filter((n) => n.id !== notaId));
    setBorrando(null);
  };

  const cargar = useCallback(() => {
    notasFetch("/api/notas")
      .then((r) => (r.ok ? r.json() : { notas: [] }))
      .then((d: { notas: NotaItem[] }) => setNotas(d.notas ?? []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (deviceId) {
      cargar();
    } else {
      // Sin device (falló la creación): salir del spinner para mostrar la UI.
      setCargando(false);
    }
  }, [ready, deviceId, cargar]);

  const crearNota = async () => {
    setCreando(true);
    try {
      const res = await notasFetch("/api/notas", { method: "POST", body: "{}" });
      if (res.ok) {
        const { nota } = await res.json();
        router.push(`/notas/${nota.id}`);
      }
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
        <div className="flex items-center gap-2">
          <PushToggle deviceReady={ready} />
          <ThemeToggle />
          <Button variant="outline" size="icon" onClick={() => setAjustes(true)} aria-label="Ajustes">
            <Settings />
          </Button>
        </div>
      </header>

      {ready && !hasPassword && !avisoOculto && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Protegé tus notas</p>
              <p className="text-xs text-muted-foreground">
                Definí una contraseña para poder recuperar tus notas en otro dispositivo o navegador.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setAjustes(true)}
              >
                Definir contraseña
              </Button>
            </div>
            <button
              onClick={() => setAvisoOculto(true)}
              aria-label="Cerrar"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <Button onClick={crearNota} disabled={creando || !ready} className="mb-6" size="lg">
        {creando ? <Loader2 className="animate-spin" /> : <Plus />}
        Nueva nota
      </Button>

      {cargando ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : notas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Todavía no tenés notas. Creá la primera.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {notas.map((nota) => (
            <li key={nota.id} className="relative">
              <button
                onClick={() => router.push(`/notas/${nota.id}`)}
                className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4 pr-12 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="line-clamp-1 font-medium">
                  {nota.title?.trim() || "Sin título"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(nota.updatedAt).toLocaleDateString("es-AR")}
                </span>
              </button>
              <button
                onClick={(e) => eliminarNota(e, nota.id)}
                disabled={borrando === nota.id}
                aria-label="Eliminar nota"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                {borrando === nota.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <NotasSettings
        open={ajustes}
        onClose={() => setAjustes(false)}
        onRecover={recuperar}
        onSetPassword={establecerPassword}
      />
    </div>
  );
}
