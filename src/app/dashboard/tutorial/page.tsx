"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter as useNextRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { stepsPropietario, stepsEmpleado } from "@/lib/tutorial-steps";

function TutorialContent() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  const router = useNextRouter();

  const userRol = (session?.user as { rol?: string } | undefined)?.rol ?? "propietario";
  const steps = userRol === "empleado" ? stepsEmpleado : stepsPropietario;

  const initialStep = parseInt(searchParams.get("step") ?? "0", 10);
  const [currentStep, setCurrentStep] = useState(isNaN(initialStep) ? 0 : initialStep);
  const [completing, setCompleting] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState<number[]>([]);

  useEffect(() => {
    const parsed = parseInt(searchParams.get("step") ?? "0", 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < steps.length) {
      setCurrentStep(parsed);
    }
  }, [searchParams, steps.length]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("tutorialVisited") ?? "[]") as number[];
    setVisitedSteps(stored);
  }, [currentStep]);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const mustVisit = !!step.moduleHref && !visitedSteps.includes(currentStep);

  async function handleFinish() {
    setCompleting(true);
    try {
      await fetch("/api/tutorial/complete", { method: "PATCH" });
      localStorage.setItem("tutorialJustCompleted", "1");
      await update();
      router.push("/dashboard/configuracion?tutorialDone=1");
    } catch {
      setCompleting(false);
    }
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      {/* Encabezado */}
      <div>
        <h1 className="font-heading text-2xl text-[#2A2829] dark:text-[#e2e8f0]">Tutorial de bienvenida</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paso {currentStep + 1} de {steps.length}
        </p>
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-1.5 bg-[#E0E0DB] dark:bg-[#2d3548] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--brand-color)] transition-all duration-300 rounded-full"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          aria-label={`Progreso: paso ${currentStep + 1} de ${steps.length}`}
        />
      </div>

      {/* Tarjeta del paso */}
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-8 flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-[#F4F5F7] dark:bg-[#0f172a] flex items-center justify-center">
            <span
              className="material-symbols-outlined text-[var(--brand-color)] dark:text-white"
              style={{ fontSize: "24px" }}
              translate="no"
            >
              {step.icon}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-xl text-[#2A2829] dark:text-[#e2e8f0]">{step.title}</h2>
            <p className="text-sm text-[#6b7280] dark:text-[#94a3b8] leading-relaxed">{step.description}</p>
          </div>
        </div>

        {step.moduleHref && (
          <Link
            href={`${step.moduleHref}?fromTutorial=${currentStep}`}
            className="self-start flex items-center gap-2 rounded-md px-4 py-2 text-sm border border-[var(--brand-color)] text-[var(--brand-color)] dark:border-white dark:text-white hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">arrow_forward</span>
            {step.moduleLabel}
          </Link>
        )}
      </div>

      {/* Índice de pasos */}
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Pasos del tutorial">
        {steps.map((s, i) => {
          const isBlocked = i > currentStep && mustVisit;
          const isPastBlocked = i > currentStep && steps.slice(currentStep, i).some((_, offset) => {
            const idx = currentStep + offset;
            return !!steps[idx].moduleHref && !visitedSteps.includes(idx);
          });
          const disabled = isBlocked || isPastBlocked;
          return (
            <button
              key={i}
              onClick={() => !disabled && setCurrentStep(i)}
              role="listitem"
              aria-label={`Ir al paso ${i + 1}: ${s.title}`}
              aria-current={i === currentStep ? "step" : undefined}
              disabled={disabled}
              className={cn(
                "w-7 h-7 rounded-full text-xs font-medium transition-colors",
                i === currentStep
                  ? "bg-[var(--brand-color)] text-white"
                  : i < currentStep
                  ? "bg-[#E0E0DB] dark:bg-[#2d3548] text-[#6b7280] dark:text-[#94a3b8]"
                  : disabled
                  ? "bg-[#F4F5F7] dark:bg-[#1e293b] text-[#6b7280] dark:text-[#94a3b8] border border-[#E0E0DB] dark:border-[#2d3548] opacity-40 cursor-not-allowed"
                  : "bg-[#F4F5F7] dark:bg-[#1e293b] text-[#6b7280] dark:text-[#94a3b8] border border-[#E0E0DB] dark:border-[#2d3548]"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={isFirst}
          className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm border border-[#E0E0DB] dark:border-[#2d3548] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#F4F5F7] dark:hover:bg-[#0f172a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">arrow_back</span>
          Anterior
        </button>

        {isLast ? (
          <button
            onClick={handleFinish}
            disabled={completing || mustVisit}
            className="flex items-center gap-1.5 rounded-md px-5 py-2 text-sm bg-[var(--brand-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">check</span>
            {completing ? "Finalizando..." : "Finalizar"}
          </button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            {mustVisit && (
              <span className="text-xs text-[#6b7280] dark:text-[#94a3b8] flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: "13px" }} translate="no">info</span>
                Visitá el módulo primero
              </span>
            )}
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={mustVisit}
              className="flex items-center gap-1.5 rounded-md px-4 py-2 text-sm bg-[var(--brand-color)] text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TutorialPage() {
  return (
    <Suspense>
      <TutorialContent />
    </Suspense>
  );
}
