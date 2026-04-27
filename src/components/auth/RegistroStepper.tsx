"use client";

import { cn } from "@/lib/utils";

const PASOS = [
  { numero: 1, titulo: "Datos personales" },
  { numero: 2, titulo: "Tu empresa" },
];

type RegistroStepperProps = {
  stepActivo: 1 | 2;
};

export function RegistroStepper({ stepActivo }: RegistroStepperProps) {
  return (
    <nav aria-label="Progreso del registro" className="mb-8">
      <ol className="flex items-center gap-0">
        {PASOS.map((paso, idx) => {
          const completado = paso.numero < stepActivo;
          const activo = paso.numero === stepActivo;

          return (
            <li key={paso.numero} className="flex items-center flex-1 last:flex-none">
              {/* Círculo del paso */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  aria-current={activo ? "step" : undefined}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    completado
                      ? "border-[#4a7fbd] bg-[#253551] text-white"
                      : activo
                      ? "border-white bg-white/10 text-white"
                      : "border-white/20 bg-white/5 text-white/40"
                  )}
                >
                  {completado ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    paso.numero
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    activo ? "text-white" : completado ? "text-white/80" : "text-white/40"
                  )}
                >
                  {paso.titulo}
                </span>
              </div>

              {/* Línea conectora */}
              {idx < PASOS.length - 1 && (
                <div
                  aria-hidden="true"
                  className={cn(
                    "mx-3 h-0.5 flex-1 transition-colors",
                    completado ? "bg-[#253551]" : "bg-white/20"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
