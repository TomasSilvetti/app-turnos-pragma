"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const DEFAULT_COLOR = "#253551";

// ── Colour conversion helpers ────────────────────────────────────────────────

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, v];
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

function hueToHex(h: number): string {
  return hsvToHex(h, 1, 1);
}

function isValidHex(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v);
}

// ── Sub-components ───────────────────────────────────────────────────────────

type GradientProps = {
  hue: number;
  saturation: number;
  brightness: number;
  onChange: (s: number, v: number) => void;
};

function SaturationBrightnessField({ hue, saturation, brightness, onChange }: GradientProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const compute = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current!.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const v = Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height));
      onChange(s, v);
    },
    [onChange]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const { clientX, clientY } =
        "touches" in e ? e.touches[0] : e;
      compute(clientX, clientY);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [compute]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const { clientX, clientY } =
      "touches" in e ? e.touches[0] : e;
    compute(clientX, clientY);
  };

  const thumbLeft = `${saturation * 100}%`;
  const thumbTop = `${(1 - brightness) * 100}%`;

  return (
    <div
      ref={ref}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      className="relative w-full h-36 rounded-lg cursor-crosshair select-none touch-none"
      style={{ backgroundColor: hueToHex(hue) }}
    >
      {/* white → transparent (left→right) */}
      <div className="absolute inset-0 rounded-lg" style={{ background: "linear-gradient(to right, #fff, transparent)" }} />
      {/* transparent → black (top→bottom) */}
      <div className="absolute inset-0 rounded-lg" style={{ background: "linear-gradient(to bottom, transparent, #000)" }} />
      {/* thumb */}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{ left: thumbLeft, top: thumbTop, backgroundColor: hsvToHex(hue, saturation, brightness) }}
      />
    </div>
  );
}

type HueSliderProps = {
  hue: number;
  onChange: (h: number) => void;
};

function HueSlider({ hue, onChange }: HueSliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const compute = useCallback(
    (clientX: number) => {
      const rect = ref.current!.getBoundingClientRect();
      const h = Math.min(360, Math.max(0, ((clientX - rect.left) / rect.width) * 360));
      onChange(h);
    },
    [onChange]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      compute(clientX);
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [compute]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    compute(clientX);
  };

  return (
    <div
      ref={ref}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      className="relative h-3 w-full rounded-full cursor-pointer select-none touch-none"
      style={{
        background:
          "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
      }}
    >
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white shadow-md pointer-events-none"
        style={{ left: `${(hue / 360) * 100}%`, backgroundColor: hueToHex(hue) }}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type Props = {
  currentColor?: string;
  onConfirm: (color: string) => void;
};

export function BrandColorPicker({ currentColor = DEFAULT_COLOR, onConfirm }: Props) {
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [hexInput, setHexInput] = useState(currentColor);
  const overlayRef = useRef<HTMLDivElement>(null);

  const pickedColor = hsvToHex(hue, saturation, brightness);

  function syncFromHex(hex: string) {
    const [h, s, v] = hexToHsv(hex);
    setHue(h);
    setSaturation(s);
    setBrightness(v);
  }

  useEffect(() => {
    if (isValidHex(currentColor)) syncFromHex(currentColor);
    setHexInput(currentColor);
  }, [currentColor]);

  function openModal() {
    if (isValidHex(currentColor)) syncFromHex(currentColor);
    setHexInput(currentColor);
    setOpen(true);
  }

  function closeModal() { setOpen(false); }

  function handleSvChange(s: number, v: number) {
    setSaturation(s);
    setBrightness(v);
    setHexInput(hsvToHex(hue, s, v));
  }

  function handleHueChange(h: number) {
    setHue(h);
    setHexInput(hsvToHex(h, saturation, brightness));
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setHexInput(val);
    if (isValidHex(val)) syncFromHex(val);
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
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{currentColor}</span>
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
          <div className="w-full max-w-xs rounded-xl bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-xl p-5 flex flex-col gap-4">
            <h2
              id="brand-color-modal-title"
              className="font-heading text-base font-semibold text-[#2A2829] dark:text-[#e2e8f0]"
            >
              Color de empresa
            </h2>

            {/* Gradiente saturación/brillo */}
            <SaturationBrightnessField
              hue={hue}
              saturation={saturation}
              brightness={brightness}
              onChange={handleSvChange}
            />

            {/* Slider hue */}
            <HueSlider hue={hue} onChange={handleHueChange} />

            {/* Preview + hex input */}
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full border border-[#E0E0DB] dark:border-[#2d3548] shadow-sm shrink-0"
                style={{ backgroundColor: pickedColor }}
                aria-hidden="true"
              />
              <input
                id="hex-input"
                type="text"
                value={hexInput}
                onChange={handleHexInput}
                maxLength={7}
                placeholder="#253551"
                aria-label="Valor hexadecimal"
                className={cn(
                  "h-9 flex-1 rounded-lg border px-3 text-sm font-mono bg-white dark:bg-[#0f172a] text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 outline-none transition-colors",
                  "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20 dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]/20",
                  isValidHex(hexInput) || hexInput === ""
                    ? "border-[#E0E0DB] dark:border-[#2d3548]"
                    : "border-red-400"
                )}
              />
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-[#E0E0DB] text-[#2A2829] hover:bg-[#F4F5F7] dark:text-[#e2e8f0]"
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
