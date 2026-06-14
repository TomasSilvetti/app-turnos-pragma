"use client";

// El effect sincroniza con APIs del navegador (matchMedia, beforeinstallprompt).
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPWAButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [verInstruccionesIOS, setVerInstruccionesIOS] = useState(false);

  useEffect(() => {
    const w = window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent };
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalada(standalone);
    if (w.__pwaPrompt) setDeferred(w.__pwaPrompt);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalada) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="size-4 text-emerald-500" /> App instalada en este dispositivo.
      </p>
    );
  }

  const instalar = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => {});
      setDeferred(null);
    } else {
      // iOS/Safari no exponen API de instalación: mostrar el paso manual.
      setVerInstruccionesIOS(true);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={instalar} className="w-full">
        <Download /> Instalar app
      </Button>
      {verInstruccionesIOS && (
        <p className="text-xs text-muted-foreground">
          En iPhone/iPad: tocá el botón <strong>Compartir</strong> de Safari y elegí{" "}
          <strong>Agregar a inicio</strong>. La app se abrirá directo en tus notas.
        </p>
      )}
    </div>
  );
}
