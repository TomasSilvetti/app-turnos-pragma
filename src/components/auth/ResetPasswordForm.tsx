"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type FormValues = {
  password: string;
  confirmPassword: string;
};

type Props = {
  token: string;
};

export function ResetPasswordForm({ token }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const password = watch("password") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";

  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    hasUppercase &&
    hasSpecial &&
    passwordsMatch &&
    !isSubmitting;

  async function onSubmit(data: FormValues) {
    setTokenError(null);
    setNetworkError(false);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        const json = await res.json();
        if (res.status === 400 && json.error) {
          setTokenError(json.error);
        } else {
          setNetworkError(true);
        }
      }
    } catch {
      setNetworkError(true);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check size={24} className="text-green-600" />
        </div>
        <p className="text-sm text-slate-700">
          ¡Contraseña restablecida! Redirigiendo al inicio de sesión...
        </p>
      </div>
    );
  }

  if (tokenError && (tokenError.includes("inválido") || tokenError.includes("expiró"))) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <X size={24} className="text-red-500" />
        </div>
        <p className="text-sm text-slate-700">{tokenError}</p>
        <a
          href="/olvide-mi-contrasena"
          className="mt-2 inline-block rounded-lg bg-[#253551] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c2a40] transition-colors"
        >
          Solicitar nuevo link
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Nueva contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Nueva contraseña"
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20 border-slate-200"
            )}
            {...register("password")}
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Indicadores de requisitos */}
        {password.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <RequirementIndicator met={hasUppercase} label="Al menos una mayúscula" />
            <RequirementIndicator met={hasSpecial} label="Al menos un carácter especial" />
          </div>
        )}
      </div>

      {/* Confirmar contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
          Confirmar contraseña
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repetí tu contraseña"
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              confirmPassword.length > 0 && !passwordsMatch
                ? "border-red-400"
                : "border-slate-200"
            )}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <p role="alert" className="text-xs text-red-500">
            Las contraseñas no coinciden
          </p>
        )}
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
        {isSubmitting ? "Restableciendo..." : "Restablecer contraseña"}
      </Button>
    </form>
  );
}

function RequirementIndicator({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <Check size={12} className="text-green-600 shrink-0" />
      ) : (
        <X size={12} className="text-slate-400 shrink-0" />
      )}
      <span className={cn("text-xs", met ? "text-green-600" : "text-slate-400")}>{label}</span>
    </div>
  );
}
