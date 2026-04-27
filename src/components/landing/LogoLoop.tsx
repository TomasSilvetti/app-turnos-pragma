"use client";

import { useEffect, useRef } from "react";
import {
  Salad,
  Dumbbell,
  Scale,
  Calculator,
  Smile,
  PawPrint,
  Pen,
  Hand,
  Mic2,
  Lightbulb,
  Footprints,
  Sparkles,
} from "lucide-react";

const profesiones = [
  { icon: Salad, nombre: "Nutricionista" },
  { icon: Dumbbell, nombre: "Entrenador personal" },
  { icon: Scale, nombre: "Abogado" },
  { icon: Calculator, nombre: "Contador" },
  { icon: Smile, nombre: "Dentista" },
  { icon: PawPrint, nombre: "Veterinario" },
  { icon: Pen, nombre: "Tatuador" },
  { icon: Hand, nombre: "Masajista" },
  { icon: Mic2, nombre: "Fonoaudiólogo" },
  { icon: Lightbulb, nombre: "Coach" },
  { icon: Footprints, nombre: "Podólogo" },
  { icon: Sparkles, nombre: "Esteticista" },
];

const doubled = [...profesiones, ...profesiones];

export function LogoLoop() {
  const stripRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const wrapper = wrapperRef.current;
    if (!strip || !wrapper) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        strip.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
      },
      { threshold: 0 }
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-screen overflow-hidden" style={{ marginLeft: "calc(50% - 50vw)" }}>
      <div ref={stripRef} className="flex w-max animate-logo-loop gap-10">
        {doubled.map(({ icon: Icon, nombre }, i) => (
          <div
            key={i}
            className="flex shrink-0 flex-col items-center gap-2"
          >
            <Icon className="h-8 w-8 text-slate-400" />
            <span className="whitespace-nowrap text-xs text-slate-500">
              {nombre}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
