"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Botón "Instalar app" para el celular. Aparece solo cuando el navegador ofrece
// instalar la PWA (beforeinstallprompt) y no está ya instalada.
export function InstalarPWA() {
  const [evento, setEvento] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const yaInstalada =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (yaInstalada) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as PromptEvent);
    };
    const onInstalled = () => setEvento(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!evento) return null;

  const instalar = async () => {
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  };

  return (
    <button
      onClick={instalar}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 px-3.5 text-sm font-medium text-white shadow-sm transition-transform active:scale-95"
    >
      <Download className="size-4" />
      Instalar app
    </button>
  );
}
