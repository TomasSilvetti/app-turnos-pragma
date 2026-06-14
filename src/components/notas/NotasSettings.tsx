"use client";

import { useEffect, useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notasFetch } from "@/lib/notas/client";
import { Modal } from "./Modal";

export function NotasSettings({
  open,
  onClose,
  onRecover,
}: {
  open: boolean;
  onClose: () => void;
  onRecover: (phrase: string) => Promise<boolean>;
}) {
  const [phrase, setPhrase] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [input, setInput] = useState("");
  const [recuperando, setRecuperando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    notasFetch("/api/notas/device")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { recoveryPhrase: string } | null) => setPhrase(d?.recoveryPhrase ?? null))
      .catch(() => {});
  }, [open]);

  const copiar = async () => {
    if (!phrase) return;
    await navigator.clipboard.writeText(phrase).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const recuperar = async () => {
    setError(null);
    setRecuperando(true);
    const ok = await onRecover(input.trim());
    setRecuperando(false);
    if (!ok) {
      setError("No encontramos notas con esa frase.");
      return;
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Tus notas">
      <div className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Frase de recuperación</h3>
          <p className="text-xs text-muted-foreground">
            Guardala. Con esta frase podés recuperar tus notas en otro dispositivo o navegador.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">
              {phrase ?? "…"}
            </code>
            <Button variant="outline" size="icon" onClick={copiar} aria-label="Copiar frase">
              {copiado ? <Check className="text-emerald-500" /> : <Copy />}
            </Button>
          </div>
        </section>

        <section className="space-y-2 border-t border-border pt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <KeyRound className="size-4" /> Recuperar otro dispositivo
          </h3>
          <p className="text-xs text-muted-foreground">
            Ingresá la frase de otro dispositivo para traer esas notas a este navegador.
          </p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="sol-monte-faro-abeja"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={recuperar} disabled={!input.trim() || recuperando} className="w-full">
            {recuperando ? "Recuperando…" : "Recuperar notas"}
          </Button>
        </section>
      </div>
    </Modal>
  );
}
