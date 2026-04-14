"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RegistroStepper } from "@/components/auth/RegistroStepper";
import { RegistroStep1Form } from "@/components/auth/RegistroStep1Form";
import { RegistroStep2Form } from "@/components/auth/RegistroStep2Form";

function RegistroContent() {
  const searchParams = useSearchParams();
  const initialStep = searchParams.get("step") === "2" ? 2 : 1;

  const [step, setStep] = useState<1 | 2>(initialStep as 1 | 2);
  const [pendingSetup, setPendingSetup] = useState(initialStep === 2);

  return (
    <div className="min-h-screen bg-[#0f1623] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#253551]">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Crear cuenta</h1>
            <p className="mt-1 text-sm text-slate-500">
              {step === 1
                ? "Completá tus datos para comenzar"
                : "Ahora configurá tu empresa"}
            </p>
          </div>

          {/* Stepper */}
          <RegistroStepper stepActivo={step} />

          {/* Formulario activo */}
          {step === 1 ? (
            <RegistroStep1Form
              onSuccess={() => setStep(2)}
            />
          ) : (
            <RegistroStep2Form
              pendingSetup={pendingSetup}
              onSuccess={() => {
                setPendingSetup(false);
              }}
            />
          )}

          {step === 1 && (
            <p className="mt-6 text-center text-sm text-slate-500">
              ¿Ya tenés cuenta?{" "}
              <a
                href="/login"
                className="font-medium text-[#253551] hover:text-[#1c2a40]"
              >
                Iniciá sesión
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroContent />
    </Suspense>
  );
}
