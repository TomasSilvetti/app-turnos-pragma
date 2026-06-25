"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shirt, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .regex(/[A-Z]/, "Debe tener al menos una mayúscula")
      .regex(/[^a-zA-Z0-9]/, "Debe tener al menos un carácter especial"),
    confirmar: z.string().min(1, "Confirmá la contraseña"),
  })
  .refine((d) => d.password === d.confirmar, {
    message: "Las contraseñas no coinciden",
    path: ["confirmar"],
  });

type Valores = z.infer<typeof schema>;

function Contenido() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [verPass, setVerPass] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (data: Valores) => {
    setErrorServidor(null);
    const res = await fetch("/api/lavanderia/admin/restablecer-contrasena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: data.password }),
    });
    if (res.ok) {
      setListo(true);
      setTimeout(() => router.replace("/lavanderia/admin/login"), 2000);
    } else {
      const d = await res.json().catch(() => ({}));
      setErrorServidor(d.error ?? "No se pudo restablecer la contraseña");
    }
  };

  if (!token) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-red-500">El link no es válido.</p>
        <Link href="/lavanderia/admin/recuperar-contrasena" className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-500">
          Solicitar uno nuevo
        </Link>
      </div>
    );
  }

  if (listo) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="size-10 text-emerald-500" />
        <p className="text-sm text-slate-600">Contraseña actualizada. Redirigiendo al login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            type={verPass ? "text" : "password"}
            autoComplete="new-password"
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmar" className="text-sm font-medium text-slate-700">
          Confirmar contraseña
        </label>
        <input
          id="confirmar"
          type={verPass ? "text" : "password"}
          autoComplete="new-password"
          className={cn(
            "h-10 rounded-xl border bg-white/80 px-3 text-sm text-slate-800 outline-none transition-colors focus:border-sky-300 focus:ring-2 focus:ring-sky-200",
            errors.confirmar ? "border-red-300" : "border-white/70"
          )}
          {...register("confirmar")}
        />
        {errors.confirmar && <p className="text-xs text-red-500">{errors.confirmar.message}</p>}
      </div>

      {errorServidor && (
        <p role="alert" className="text-center text-sm text-red-500">
          {errorServidor}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 w-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white hover:opacity-95"
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : "Guardar contraseña"}
      </Button>
    </form>
  );
}

export default function AdminRestablecerPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/70 p-7 shadow-[0_8px_40px_-12px_rgba(16,24,40,0.25)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_4px_12px_-2px_rgba(56,120,255,0.45)]">
            <Shirt className="size-6" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-slate-800">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-slate-500">Elegí una contraseña segura</p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <Contenido />
        </Suspense>
      </div>
    </div>
  );
}
