"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Sucursal, SucursalFormValues } from "./types";

type SucursalFormProps = {
  initialValues?: Sucursal;
  isSaving?: boolean;
  error?: string;
  onSave: (data: SucursalFormValues) => void;
  onCancel: () => void;
};

export function SucursalForm({ initialValues, isSaving, error, onSave, onCancel }: SucursalFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SucursalFormValues>({
    mode: "onChange",
    defaultValues: initialValues
      ? { name: initialValues.name, address: initialValues.address }
      : { name: "", address: "" },
  });

  useEffect(() => {
    if (initialValues) {
      reset({ name: initialValues.name, address: initialValues.address });
    } else {
      reset({ name: "", address: "" });
    }
  }, [initialValues, reset]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sucursal-form-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-5 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="sucursal-form-title" className="font-heading text-lg text-[var(--brand-color)] dark:text-[#93c5fd]">
            {initialValues ? "Editar sucursal" : "Nueva sucursal"}
          </h2>
          <button
            onClick={onCancel}
            className="text-[#2A2829] dark:text-[#e2e8f0] hover:text-[var(--brand-color)] transition-colors"
            aria-label="Cerrar formulario"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-5">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Nombre <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="Ej: Sucursal Centro"
              aria-invalid={!!errors.name}
              className={cn(
                "h-10 rounded-lg border bg-white dark:bg-[#080c14] px-3 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
                "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
                errors.name ? "border-red-400" : "border-[#E0E0DB] dark:border-[#1a2840]"
              )}
              {...register("name", { required: "El nombre es obligatorio" })}
            />
            {errors.name && (
              <p role="alert" className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Dirección */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="address" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Dirección <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="address"
              type="text"
              placeholder="Ej: Av. Corrientes 1234, CABA"
              aria-invalid={!!errors.address}
              className={cn(
                "h-10 rounded-lg border bg-white dark:bg-[#080c14] px-3 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
                "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
                errors.address ? "border-red-400" : "border-[#E0E0DB] dark:border-[#1a2840]"
              )}
              {...register("address", { required: "La dirección es obligatoria" })}
            />
            {errors.address && (
              <p role="alert" className="text-xs text-red-500">{errors.address.message}</p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSaving}
              className="flex-1 bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-40"
            >
              {isSaving ? "Guardando..." : initialValues ? "Guardar cambios" : "Crear sucursal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
