"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shirt, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

type Valores = z.infer<typeof schema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [verPass, setVerPass] = useState(false);
  const [errorCreds, setErrorCreds] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (data: Valores) => {
    setErrorCreds(null);
    const res = await fetch("/api/lavanderia/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.replace("/lavanderia/admin/tablero");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setErrorCreds(d.error ?? "No se pudo iniciar sesión");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/70 p-7 shadow-[0_8px_40px_-12px_rgba(16,24,40,0.25)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_4px_12px_-2px_rgba(56,120,255,0.45)]">
            <Shirt className="size-6" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-slate-800">Panel de administración</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresá con tu cuenta de administrador</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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
                "h-10 rounded-xl border bg-white/80 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-200",
                errors.email ? "border-red-300" : "border-white/70"
              )}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={verPass ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                className={cn(
                  "h-10 w-full rounded-xl border bg-white/80 px-3 pr-10 text-sm text-slate-800 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-200",
                  errors.password ? "border-red-300" : "border-white/70"
                )}
                {...register("password")}
              />
              <button
                type="button"
                aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setVerPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>

          {errorCreds && (
            <p role="alert" className="text-center text-sm text-red-500">
              {errorCreds}
            </p>
          )}

          <div className="-mt-1 flex justify-end">
            <Link href="/lavanderia/admin/recuperar-contrasena" className="text-sm text-indigo-600 hover:text-indigo-500">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white hover:opacity-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : "Ingresar"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link href="/lavanderia" className="hover:text-slate-700">
            ← Volver al tablero
          </Link>
        </p>
      </div>
    </div>
  );
}
