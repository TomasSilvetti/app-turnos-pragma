"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { cn } from "@/lib/utils";

const RUBROS = [
  "Peluquería",
  "Barbería",
  "Estética",
  "Manicuría y Pedicuría",
  "Odontología",
  "Psicología",
  "Kinesiología",
  "Nutrición",
  "Personal Trainer",
  "Pilates",
  "Yoga",
  "Tatuajes y Piercing",
  "Fotografía",
  "Consultoría",
  "Otro",
];

type Step2Values = {
  name: string;
  rubro: string;
};

type Props = {
  pendingSetup?: boolean;
  onSuccess: () => void;
};

export function RegistroStep2Form({ pendingSetup = false, onSuccess }: Props) {
  const { update } = useSession();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Step2Values>({ mode: "onSubmit" });

  const values = watch();
  const allFilled = !!(values.name?.trim() && values.rubro?.trim());

  async function handleFormSubmit(data: Step2Values) {
    setServerError(null);

    const res = await fetch("/api/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        rubro: data.rubro.trim(),
      }),
    });

    if (res.status === 409) {
      setServerError("Tu cuenta ya tiene una empresa registrada.");
      return;
    }

    if (res.status !== 201) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error ?? "Ocurrió un error al crear la empresa. Intentá de nuevo.");
      return;
    }

    // Actualizar sesión para reflejar que ahora tiene businessProfile
    await update();
    onSuccess();
    window.location.href = "/dashboard";
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-5"
    >
      {pendingSetup && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3">
          <p className="text-sm text-green-400">
            Tu cuenta está lista. Solo falta configurar tu empresa para acceder al dashboard.
          </p>
        </div>
      )}

      {/* Nombre de empresa */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="empresa-name" className="text-sm font-medium text-white">
          Nombre de tu empresa
        </label>
        <input
          id="empresa-name"
          type="text"
          autoComplete="organization"
          placeholder="Ej: Peluquería La Esquina"
          aria-invalid={!!errors.name}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
            errors.name ? "border-red-400" : "border-slate-200"
          )}
          {...register("name", { required: "El nombre de la empresa es obligatorio" })}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-red-500">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Rubro */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white">
          Rubro
        </label>
        <Controller
          name="rubro"
          control={control}
          rules={{ required: "El rubro es obligatorio" }}
          render={({ field }) => (
            <CustomSelect
              value={field.value ?? ""}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Seleccioná un rubro"
              hasError={!!errors.rubro}
              options={RUBROS.map((r) => ({ value: r, label: r }))}
            />
          )}
        />
        {errors.rubro && (
          <p role="alert" className="text-xs text-red-500">
            {errors.rubro.message}
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
        {isSubmitting ? "Creando empresa..." : "Crear empresa"}
      </Button>
    </form>
  );
}
