"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X, Smartphone, Loader2 } from "lucide-react";

// Modal con un QR que apunta a /lavanderia. Escaneándolo desde el celular se
// abre la app en modo carga de OT (la vista mobile).
export function QRModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const destino = `${window.location.origin}/lavanderia`;
    setUrl(destino);
    QRCode.toDataURL(destino, { width: 320, margin: 2 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-3xl border border-white/60 bg-white/90 p-6 text-center shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <Smartphone className="size-5 text-sky-500" /> Abrir en el celular
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">Escaneá este código para cargar OTs desde el celular.</p>

        <div className="flex justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Código QR" className="size-56 rounded-2xl border border-slate-200 bg-white p-2" />
          ) : (
            <div className="flex size-56 items-center justify-center text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          )}
        </div>

        <p className="mt-4 break-all text-xs text-slate-400">{url}</p>
      </div>
    </div>
  );
}
