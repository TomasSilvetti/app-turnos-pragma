"use client";

// El effect resetea el formulario y consulta el estado del device cuando se abre
// el modal (sincroniza props/sistema externo → estado): los setState son intencionales.
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { KeyRound, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notasFetch } from "@/lib/notas/client";
import type { SetPasswordResult } from "@/hooks/useNotaDevice";
import { Modal } from "./Modal";
import { InstallPWAButton } from "./InstallPWAButton";

export function NotasSettings({
  open,
  onClose,
  onRecover,
  onSetPassword,
}: {
  open: boolean;
  onClose: () => void;
  onRecover: (password: string) => Promise<boolean>;
  onSetPassword: (password: string) => Promise<SetPasswordResult>;
}) {
  const [hasPassword, setHasPassword] = useState(false);

  // Definir / cambiar contraseña.
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [okGuardado, setOkGuardado] = useState(false);
  const [errorPass, setErrorPass] = useState<string | null>(null);

  // Recuperar otro dispositivo.
  const [input, setInput] = useState("");
  const [recuperando, setRecuperando] = useState(false);
  const [errorRec, setErrorRec] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setOkGuardado(false);
    setErrorPass(null);
    setErrorRec(null);
    setPass("");
    setPass2("");
    setInput("");
    notasFetch("/api/notas/device")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { hasPassword: boolean } | null) => setHasPassword(Boolean(d?.hasPassword)))
      .catch(() => {});
  }, [open]);

  const guardar = async () => {
    setErrorPass(null);
    setOkGuardado(false);
    if (pass !== pass2) {
      setErrorPass("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    const res = await onSetPassword(pass.trim());
    setGuardando(false);
    if (!res.ok) {
      setErrorPass(res.error ?? "No se pudo guardar la contraseña.");
      return;
    }
    setHasPassword(true);
    setOkGuardado(true);
    setPass("");
    setPass2("");
  };

  const recuperar = async () => {
    setErrorRec(null);
    setRecuperando(true);
    const ok = await onRecover(input.trim());
    setRecuperando(false);
    if (!ok) {
      setErrorRec("No encontramos notas con esa contraseña.");
      return;
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Tus notas">
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Instalar en el celular</h3>
          <p className="text-xs text-muted-foreground">
            Instalá Notas como app: abre directo en esta pantalla, sin el resto del sistema.
          </p>
          <InstallPWAButton />
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Lock className="size-4" />
            {hasPassword ? "Cambiar contraseña" : "Definir contraseña"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {hasPassword
              ? "Ya tenés una contraseña de recuperación. Podés cambiarla cuando quieras."
              : "Elegí una contraseña para poder recuperar tus notas en otro dispositivo o navegador. Guardala: es la única forma de recuperarlas."}
          </p>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Nueva contraseña"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            placeholder="Repetir contraseña"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errorPass && <p className="text-xs text-destructive">{errorPass}</p>}
          {okGuardado && (
            <p className="flex items-center gap-1 text-xs text-emerald-500">
              <Check className="size-3.5" /> Contraseña guardada.
            </p>
          )}
          <Button onClick={guardar} disabled={!pass.trim() || !pass2.trim() || guardando} className="w-full">
            {guardando ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <KeyRound className="size-4" /> Recuperar otro dispositivo
          </h3>
          <p className="text-xs text-muted-foreground">
            Ingresá la contraseña de otro dispositivo para traer esas notas a este navegador.
          </p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Contraseña"
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errorRec && <p className="text-xs text-destructive">{errorRec}</p>}
          <Button onClick={recuperar} disabled={!input.trim() || recuperando} className="w-full">
            {recuperando ? "Recuperando…" : "Recuperar notas"}
          </Button>
        </section>
      </div>
    </Modal>
  );
}
