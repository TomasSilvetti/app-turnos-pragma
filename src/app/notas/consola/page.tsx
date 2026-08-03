"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, History, KeyRound, Lock, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNotaDevice } from "@/hooks/useNotaDevice";
import { notasFetch } from "@/lib/notas/client";
import { ThemeToggle } from "@/components/notas/ThemeToggle";
import { VistaViva } from "@/components/notas/consola/VistaViva";
import { Chat } from "@/components/notas/consola/Chat";
import { consolaFetch, getToken, olvidarToken, setToken, type SesionConsola } from "@/lib/notas/consolaClient";
import { fechaCorta, type CuentaHarness } from "@/lib/notas/trabajoClient";

export default function ConsolaPage() {
  const router = useRouter();
  const { ready, deviceId } = useNotaDevice();

  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [sesiones, setSesiones] = useState<SesionConsola[]>([]);
  const [actual, setActual] = useState<string | null>(null);
  const [cuentas, setCuentas] = useState<CuentaHarness[]>([]);
  const [verSesiones, setVerSesiones] = useState(false);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await consolaFetch("/api/notas/consola/sesiones").catch(() => null);
    if (res?.status === 403) {
      olvidarToken();
      setAutorizado(false);
      return;
    }
    if (!res?.ok) return;
    const { sesiones } = await res.json();
    setSesiones(sesiones);
    setAutorizado(true);
    setActual((prev) => prev ?? sesiones[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (!ready || !deviceId) return;
    if (!getToken()) {
      setAutorizado(false);
      return;
    }
    cargar();
  }, [ready, deviceId, cargar]);

  // Los emails de las cuentas salen del panel del harness: es lo que hace que
  // el selector diga "silvetti.tomas7@gmail.com" y no "cuenta 2".
  useEffect(() => {
    if (!autorizado) return;
    notasFetch("/api/notas/trabajo/estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCuentas(d.cuentas ?? []))
      .catch(() => {});
  }, [autorizado]);

  const nueva = async () => {
    setCargando(true);
    const res = await consolaFetch("/api/notas/consola/sesiones", {
      method: "POST",
      body: JSON.stringify({}),
    }).catch(() => null);
    setCargando(false);
    if (res?.ok) {
      const { sesion } = await res.json();
      setActual(sesion.id);
      setVerSesiones(false);
      cargar();
    }
  };

  const cambiarCuenta = async (cuenta: string) => {
    if (!actual) return;
    await consolaFetch(`/api/notas/consola/sesiones/${actual}`, {
      method: "PATCH",
      body: JSON.stringify({ cuenta }),
    }).catch(() => {});
    cargar();
  };

  const borrar = async (id: string) => {
    if (!confirm("¿Borrar esta conversación?")) return;
    await consolaFetch(`/api/notas/consola/sesiones/${id}`, { method: "DELETE" }).catch(() => {});
    if (actual === id) setActual(null);
    cargar();
  };

  if (autorizado === false) return <PedirPin onEntrar={() => cargar()} />;

  const sesion = sesiones.find((s) => s.id === actual);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-6 pt-6 sm:px-6">
      <header className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.push("/notas")} aria-label="Volver">
          <ArrowLeft />
        </Button>
        <h1 className="flex-1 truncate text-2xl font-bold tracking-tight">Consola</h1>
        <Button variant="outline" size="icon" onClick={nueva} disabled={cargando} aria-label="Conversación nueva" title="Conversación nueva">
          {cargando ? <Loader2 className="animate-spin" /> : <Plus />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setVerSesiones((v) => !v)}
          aria-label="Conversaciones"
          title="Conversaciones anteriores"
        >
          <History />
        </Button>
        <ThemeToggle />
      </header>

      {verSesiones && (
        <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-2">
          {sesiones.length === 0 && <li className="p-2 text-sm text-muted-foreground">No hay conversaciones.</li>}
          {sesiones.map((s) => (
            <li key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActual(s.id);
                  setVerSesiones(false);
                }}
                className={cn(
                  "min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted",
                  s.id === actual && "bg-muted"
                )}
              >
                <p className="truncate text-sm">{s.titulo || "Sin título"}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fechaCorta(s.updatedAt)} · {s._count?.mensajes ?? 0} mensajes
                  {s.cuenta && ` · cuenta ${s.cuenta}`}
                </p>
              </button>
              <button
                onClick={() => borrar(s.id)}
                aria-label="Borrar"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <VistaViva />

      {sesion && cuentas.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cuenta</span>
          <div className="relative">
            <select
              value={sesion.cuenta ?? ""}
              onChange={(e) => cambiarCuenta(e.target.value)}
              className="appearance-none rounded-lg border border-border bg-card py-1 pl-2.5 pr-7 text-xs outline-none"
            >
              <option value="">la primera con cuota</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.email || `Cuenta ${c.nombre}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1.5 size-3.5 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground">
            cambiarla no pierde la conversación
          </span>
        </div>
      )}

      {sesion ? (
        <Chat sesionId={sesion.id} onCambio={cargar} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">No hay ninguna conversación abierta.</p>
          <Button onClick={nueva} disabled={cargando}>
            <Plus />
            Empezar una
          </Button>
        </div>
      )}
    </div>
  );
}

function PedirPin({ onEntrar }: { onEntrar: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);

  const entrar = async () => {
    if (!pin.trim()) return;
    setProbando(true);
    setError(null);
    const res = await notasFetch("/api/notas/consola/pin", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }).catch(() => null);
    setProbando(false);

    if (res?.ok) {
      setToken((await res.json()).token);
      onEntrar();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "No se pudo verificar el PIN");
    setPin("");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Lock className="size-5 text-muted-foreground" />
      </span>
      <div className="text-center">
        <h1 className="text-lg font-semibold">Consola</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Da control total sobre tu notebook, así que va con PIN aparte.
        </p>
      </div>

      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && entrar()}
        placeholder="PIN"
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-primary/40"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={entrar} disabled={!pin.trim() || probando} className="w-full" size="lg">
        {probando ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Entrar
      </Button>
    </div>
  );
}
