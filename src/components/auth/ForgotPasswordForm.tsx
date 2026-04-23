"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormValues = { email: string };

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const email = watch("email");
  const canSubmit = !!email && !isSubmitting;

  async function onSubmit(data: FormValues) {
    setNetworkError(false);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setNetworkError(true);
      }
    } catch {
      setNetworkError(true);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#253551]/10">
          <span className="material-symbols-outlined text-[#253551]">mark_email_read</span>
        </div>
        <p className="text-sm text-slate-700">
          Si el email existe, te llegará un correo con instrucciones.
        </p>
        <a
          href="/login"
          className="mt-2 text-sm font-medium text-[#253551] hover:text-[#1c2a40] transition-colors"
        >
          Volver al inicio de sesión
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
            "border-slate-200"
          )}
          {...register("email")}
        />
      </div>

      {networkError && (
        <p role="alert" className="text-sm text-red-500 text-center -mt-1">
          Ocurrió un error. Intentá de nuevo más tarde.
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit}
        className="mt-1 w-full bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Enviando..." : "Enviar"}
      </Button>

      <a
        href="/login"
        className="text-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        Volver al inicio de sesión
      </a>
    </form>
  );
}
