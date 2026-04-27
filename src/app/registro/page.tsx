"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RegistroStepper } from "@/components/auth/RegistroStepper";
import { RegistroStep1Form } from "@/components/auth/RegistroStep1Form";
import { RegistroStep2Form } from "@/components/auth/RegistroStep2Form";
import { Plasma } from "@/components/landing/Plasma";

function RegistroContent() {
  const searchParams = useSearchParams();
  const initialStep = searchParams.get("step") === "2" ? 2 : 1;

  const [step, setStep] = useState<1 | 2>(initialStep as 1 | 2);
  const [pendingSetup, setPendingSetup] = useState(initialStep === 2);

  return (
    <div className="auth-page relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <Plasma
        speed={0.5}
        color1="#080c14"
        color2="#0d1f3c"
        color3="#1a3a6b"
        color4="#0f2a50"
      />
      <div className="absolute inset-0 bg-[#080c14]/50" />
      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-[#080c14] border border-white/10 px-8 py-10 shadow-2xl">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#253551]">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-semibold text-white">Crear cuenta</h1>
            <p className="mt-1 text-sm text-white/60">
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
            <p className="mt-6 text-center text-sm text-white/60">
              ¿Ya tenés cuenta?{" "}
              <a
                href="/login"
                className="font-medium text-white hover:text-white/80 underline underline-offset-2"
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
