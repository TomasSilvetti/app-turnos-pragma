"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { QRModal } from "./QRModal";
import { InstalarPWA } from "./InstalarPWA";
import { useEsMobile } from "@/hooks/useEsMobile";

// Botón de QR (abre el modal para escanear y abrir en el celular) y, en modo
// celular, el botón para instalar la PWA. Reutilizable en navbar y sidebar.
export function BotonesApp() {
  const [qr, setQr] = useState(false);
  const esMobile = useEsMobile();

  return (
    <>
      {esMobile && <InstalarPWA />}
      <button
        onClick={() => setQr(true)}
        aria-label="Abrir en el celular (QR)"
        className="inline-flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-sky-600"
      >
        <QrCode className="size-[18px]" />
      </button>
      <QRModal open={qr} onClose={() => setQr(false)} />
    </>
  );
}
