"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAButton({ variant = "panel" }: { variant?: "banner" | "panel" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // El evento puede haberse disparado antes de que el componente montara
    const cached = (window as unknown as Record<string, unknown>).__pwaPrompt as BeforeInstallPromptEvent | undefined;
    if (cached) {
      setDeferredPrompt(cached);
    }

    function handler(e: Event) {
      e.preventDefault();
      (window as unknown as Record<string, unknown>).__pwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }

  if (installed || !deferredPrompt || dismissed) return null;

  if (variant === "banner") {
    return (
      <div className="w-full flex items-center justify-between gap-3 rounded-lg border border-[#E0E0DB] bg-white dark:bg-[#0c1220] dark:border-[#1a2840] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="material-symbols-outlined text-[#6b7280] dark:text-[#94a3b8] shrink-0" style={{ fontSize: "20px" }} translate="no">install_mobile</span>
          <span className="text-sm text-[#2A2829] dark:text-[#cbd5e1] truncate">Descargá la app para móvil</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstall}
            className="rounded-md bg-[#2A2829] dark:bg-[#e2e8f0] text-white dark:text-[#0c1220] px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[#6b7280] dark:text-[#94a3b8] hover:text-[#2A2829] dark:hover:text-[#e2e8f0] transition-colors"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }} translate="no">close</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8]">
        App
      </span>
      <button
        onClick={handleInstall}
        className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#080c14] transition-colors duration-200 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }} translate="no">install_mobile</span>
          Instalar Tuturno
        </span>
        <span className="material-symbols-outlined text-[#6b7280] dark:text-[#94a3b8]" style={{ fontSize: "16px" }} translate="no">arrow_forward</span>
      </button>
    </div>
  );
}
