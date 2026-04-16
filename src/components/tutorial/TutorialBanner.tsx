"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { stepsPropietario, stepsEmpleado } from "@/lib/tutorial-steps";

export function TutorialBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const fromTutorial = searchParams.get("fromTutorial");
  const stepIndex = fromTutorial !== null ? parseInt(fromTutorial, 10) : NaN;

  useEffect(() => {
    if (!isNaN(stepIndex)) {
      const visited = JSON.parse(localStorage.getItem("tutorialVisited") ?? "[]") as number[];
      if (!visited.includes(stepIndex)) {
        localStorage.setItem("tutorialVisited", JSON.stringify([...visited, stepIndex]));
      }
    }
  }, [stepIndex]);

  if (fromTutorial === null) return null;
  if (isNaN(stepIndex)) return null;

  const userRol = (session?.user as { rol?: string } | undefined)?.rol ?? "propietario";
  const steps = userRol === "empleado" ? stepsEmpleado : stepsPropietario;
  const step = steps[stepIndex];

  if (!step?.tooltipTitle) return null;

  const nextStep = stepIndex + 1;
  const hasNext = nextStep < steps.length;

  function handleContinue() {
    if (hasNext) {
      router.push(`/dashboard/tutorial?step=${nextStep}`);
    } else {
      router.push("/dashboard/tutorial");
    }
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 rounded-xl bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-lg p-4 flex flex-col gap-3"
      role="complementary"
      aria-label="Guía del tutorial"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-color)]">
            Tutorial — paso {stepIndex + 1} de {steps.length}
          </span>
          <span className="text-sm font-semibold text-[#2A2829] dark:text-[#e2e8f0] leading-tight">
            {step.tooltipTitle}
          </span>
        </div>
        <span
          className="material-symbols-outlined text-[var(--brand-color)] shrink-0 mt-0.5"
          style={{ fontSize: "20px" }}
          translate="no"
        >
          school
        </span>
      </div>

      <p className="text-xs text-[#6b7280] dark:text-[#94a3b8] leading-relaxed">
        {step.tooltipDescription}
      </p>

      <button
        onClick={handleContinue}
        className="self-end flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-[var(--brand-color)] text-white hover:opacity-90 transition-opacity"
      >
        {hasNext ? "Continuar tutorial" : "Finalizar tutorial"}
        <span className="material-symbols-outlined" style={{ fontSize: "14px" }} translate="no">
          arrow_forward
        </span>
      </button>
    </div>
  );
}
