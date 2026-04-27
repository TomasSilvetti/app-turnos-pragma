"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

type RegisterFormProps = {
  onSubmit: (data: RegisterFormValues) => Promise<{ emailDuplicated?: boolean }>;
};

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [emailDuplicated, setEmailDuplicated] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ mode: "onBlur" });

  const values = watch();
  const password = values.password ?? "";
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordValid = hasUppercase && hasSpecial;
  const allFilled = !!(values.name && values.email && password && passwordValid);

  async function handleFormSubmit(data: RegisterFormValues) {
    setEmailDuplicated(false);
    const result = await onSubmit(data);
    if (result?.emailDuplicated) {
      setEmailDuplicated(true);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-white">
          Nombre
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre completo"
          aria-invalid={!!errors.name}
          className={cn(
            "h-10 rounded-lg border bg-[#101827] px-3 text-sm text-white/90 placeholder:text-white/30 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
            errors.name ? "border-red-400" : "border-white/10"
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
        <label htmlFor="email" className="text-sm font-medium text-white">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          aria-invalid={!!errors.email || emailDuplicated}
          className={cn(
            "h-10 rounded-lg border bg-[#101827] px-3 text-sm text-white/90 placeholder:text-white/30 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
            errors.email || emailDuplicated ? "border-red-400" : "border-white/10"
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
            Ya existe una cuenta con ese email
          </p>
        )}
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-white">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            aria-invalid={!!errors.password}
            className={cn(
              "h-10 w-full rounded-lg border bg-[#101827] px-3 pr-10 text-sm text-white/90 placeholder:text-white/30 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.password ? "border-red-400" : "border-white/10"
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
        {password.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <PasswordRequirement met={hasUppercase} label="Al menos una mayúscula" />
            <PasswordRequirement met={hasSpecial} label="Al menos un carácter especial" />
          </div>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!allFilled || isSubmitting}
        className="mt-1 w-full bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {met ? (
        <Check size={12} className="text-green-600 shrink-0" />
      ) : (
        <X size={12} className="text-slate-400 shrink-0" />
      )}
      <span className={cn("text-xs", met ? "text-green-400" : "text-white/50")}>{label}</span>
    </div>
  );
}
