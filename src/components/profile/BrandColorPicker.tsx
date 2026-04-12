"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DEFAULT_COLOR = "#253551";

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

type Props = {
  currentColor?: string;
  onConfirm: (color: string) => void;
};

export function BrandColorPicker({ currentColor = DEFAULT_COLOR, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [pickedColor, setPickedColor] = useState(currentColor);
  const [hexInput, setHexInput] = useState(currentColor);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync when currentColor changes from outside
  useEffect(() => {
    setPickedColor(currentColor);
    setHexInput(currentColor);
  }, [currentColor]);

  function openModal() {
    setPickedColor(currentColor);
    setHexInput(currentColor);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPickedColor(val);
    setHexInput(val);
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHexInput(val);
    if (isValidHex(val)) {
      setPickedColor(val);
    }
  }

  function handleConfirm() {
    if (!isValidHex(pickedColor)) return;
    onConfirm(pickedColor);
    setOpen(false);
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closeModal();
  }

  return (
    <>
      {/* Sección en el perfil */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">Color de empresa</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openModal}
            aria-label={`Color de empresa actual: ${currentColor}. Hacer clic para cambiar`}
            className="h-10 w-10 rounded-full border-2 border-[#E0E0DB] dark:border-[#2d3548] shadow-sm cursor-pointer hover:border-[#253551] dark:hover:border-[#3b82f6] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#253551] focus-visible:ring-offset-2"
            style={{ backgroundColor: currentColor }}
          />
          <span className="font-small text-xs text-slate-500 dark:text-slate-400 font-mono">{currentColor}</span>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="brand-color-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-xl p-6 flex flex-col gap-5">
            <h2
              id="brand-color-modal-title"
              className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0]"
            >
              Color de empresa
            </h2>

            {/* Preview */}
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-full border-2 border-[#E0E0DB] shadow-sm shrink-0 transition-colors duration-150"
                style={{ backgroundColor: pickedColor }}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Vista previa</span>
                <span className="font-small text-sm font-mono text-[#2A2829] dark:text-[#e2e8f0]">{pickedColor}</span>
              </div>
            </div>

            {/* Color picker nativo */}
            <div className="flex flex-col gap-2">
              <label htmlFor="color-wheel" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                Selector de color
              </label>
              <input
                id="color-wheel"
                type="color"
                value={pickedColor}
                onChange={handleColorChange}
                className="h-12 w-full cursor-pointer rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] p-1"
              />
            </div>

            {/* Hex input */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="hex-input" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                Valor hexadecimal
              </label>
              <input
                id="hex-input"
                type="text"
                value={hexInput}
                onChange={handleHexInput}
                maxLength={7}
                placeholder="#253551"
                className={cn(
                  "h-10 rounded-lg border px-3 text-sm font-mono text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white dark:bg-[#0f172a] outline-none transition-colors",
                  "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20 dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]/20",
                  isValidHex(hexInput) || hexInput === "" ? "border-[#E0E0DB]" : "border-red-400"
                )}
              />
              {!isValidHex(hexInput) && hexInput !== "" && (
                <p role="alert" className="text-xs text-red-500">
                  Formato inválido. Usá el formato #RRGGBB (ej: #e63946)
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[#E0E0DB] text-[#2A2829] hover:bg-[#F4F5F7]"
                onClick={closeModal}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!isValidHex(pickedColor)}
                className="flex-1 bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
                onClick={handleConfirm}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
