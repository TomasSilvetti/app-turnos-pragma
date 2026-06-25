"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Shirt, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().min(1, "El email es obligatorio").email("Email inválido"),
});

type Valores = z.infer<typeof schema>;

export default function AdminRecuperarPage() {
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({ resolver: zodResolver(schema), mode: "onBlur" });

  const onSubmit = async (data: Valores) => {
    await fetch("/api/lavanderia/admin/recuperar-contrasena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
    setEnviado(true);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/60 bg-white/70 p-7 shadow-[0_8px_40px_-12px_rgba(16,24,40,0.25)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-[0_4px_12px_-2px_rgba(56,120,255,0.45)]">
            <Shirt className="size-6" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-slate-800">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-slate-500">Te enviamos un link para restablecerla</p>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <MailCheck className="size-10 text-emerald-500" />
            <p className="text-sm text-slate-600">
              Si el email corresponde a un administrador, te llegará un correo con las instrucciones.
            </p>
            <Link href="/lavanderia/admin/login" className="mt-2 text-sm text-indigo-600 hover:text-indigo-500">
              Volver al login
            </Link>
          </div>
        ) : (
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

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 w-full bg-gradient-to-br from-sky-500 to-indigo-500 text-white hover:opacity-95"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Enviar instrucciones"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              <Link href="/lavanderia/admin/login" className="hover:text-slate-700">
                ← Volver al login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
