"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Step1Values = {
  name: string;
  email: string;
  password: string;
};

type Props = {
  onSuccess: () => void;
};

export function RegistroStep1Form({ onSuccess }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [emailDuplicated, setEmailDuplicated] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Step1Values>({ mode: "onBlur" });

  const values = watch();
  const allFilled = !!(values.name?.trim() && values.email?.trim() && values.password?.trim());

  async function handleFormSubmit(data: Step1Values) {
    setEmailDuplicated(false);
    setServerError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }),
    });

    if (res.status === 409) {
      setEmailDuplicated(true);
      return;
    }

    if (res.status !== 201) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Ocurrió un error. Intentá de nuevo.");
      return;
    }

    // Registro exitoso → iniciar sesión automáticamente
    const signInResult = await signIn("credentials", {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      redirect: false,
    });

    if (signInResult?.error) {
      setServerError("La cuenta fue creada pero no pudimos iniciar sesión automáticamente. Intentá ingresar manualmente.");
      return;
    }

    onSuccess();
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-name" className="text-sm font-medium text-slate-700">
          Nombre completo
        </label>
        <input
          id="reg-name"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre completo"
          aria-invalid={!!errors.name}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
            errors.name ? "border-red-400" : "border-slate-200"
          )}
          {...register("name", { required: "El nombre es obligatorio" })}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-red-500">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          aria-invalid={!!errors.email || emailDuplicated}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
            errors.email || emailDuplicated ? "border-red-400" : "border-slate-200"
          )}
          {...register("email", {
            required: "El email es obligatorio",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Ingresá un email válido",
            },
            onChange: () => setEmailDuplicated(false),
          })}
        />
        {errors.email && (
          <p role="alert" className="text-xs text-red-500">
            {errors.email.message}
          </p>
        )}
        {emailDuplicated && !errors.email && (
          <p role="alert" className="text-xs text-red-500">
            Ya existe una cuenta con ese email.{" "}
            <a href="/login" className="underline font-medium">
              Iniciá sesión
            </a>
          </p>
        )}
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-password" className="text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={!!errors.password}
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.password ? "border-red-400" : "border-slate-200"
            )}
            {...register("password", {
              required: "La contraseña es obligatoria",
              minLength: { value: 8, message: "Mínimo 8 caracteres" },
            })}
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
        {errors.password && (
          <p role="alert" className="text-xs text-red-500">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-red-500 text-center -mt-1">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!allFilled || isSubmitting}
        className="mt-1 w-full bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Verificando..." : "Continuar"}
      </Button>
    </form>
  );
}
