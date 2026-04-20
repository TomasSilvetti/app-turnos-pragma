"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWAButton({ variant = "panel" }: { variant?: "public" | "panel" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    function handler(e: Event) {
      e.preventDefault();
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

  if (installed || !deferredPrompt) return null;

  if (variant === "public") {
    return (
      <button
        onClick={handleInstall}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#E0E0DB] bg-white dark:bg-[#1e293b] dark:border-[#2d3548] px-4 py-3 text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }} translate="no">install_mobile</span>
        Instalar app
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] dark:text-[#94a3b8]">
        App
      </span>
      <button
        onClick={handleInstall}
        className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors duration-200 cursor-pointer"
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
