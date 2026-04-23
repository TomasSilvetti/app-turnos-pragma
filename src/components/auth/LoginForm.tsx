"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [invalidCredentials, setInvalidCredentials] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({ mode: "onBlur" });

  const values = watch();
  const allFilled = !!(values.email && values.password);

  async function handleFormSubmit(data: LoginFormValues) {
    setInvalidCredentials(false);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setInvalidCredentials(true);
    } else {
      const session = await getSession();
      const pendingStep = (session?.user as { pendingStep?: string | null } | undefined)?.pendingStep;
      if (pendingStep === "business") {
        window.location.href = "/registro?step=2";
      } else {
        window.location.href = "/dashboard";
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Email */}
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
            invalidCredentials ? "border-red-400" : "border-slate-200"
          )}
          {...register("email", {
            onChange: () => setInvalidCredentials(false),
          })}
        />
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            className={cn(
              "h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              invalidCredentials ? "border-red-400" : "border-slate-200"
            )}
            {...register("password", {
              onChange: () => setInvalidCredentials(false),
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
      </div>

      {/* Error de credenciales */}
      {invalidCredentials && (
        <p role="alert" className="text-sm text-red-500 text-center -mt-1">
          Email o contraseña incorrectos
        </p>
      )}

      <div className="flex justify-end -mt-2">
        <a
          href="/olvide-mi-contrasena"
          className="text-sm text-[#253551] hover:text-[#1c2a40] transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!allFilled || isSubmitting}
        className="mt-1 w-full bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
