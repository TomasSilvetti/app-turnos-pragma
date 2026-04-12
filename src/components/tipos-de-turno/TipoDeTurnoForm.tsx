"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/NumericInput";
import { cn } from "@/lib/utils";

export type TipoDeTurnoFormValues = {
  titulo: string;
  descripcion: string;
  precio: number;
};

export type TipoDeTurno = {
  id: string;
  titulo: string;
  descripcion: string;
  precio: number;
};

type TipoDeTurnoFormProps = {
  initialValues?: TipoDeTurno;
  onSave: (data: TipoDeTurnoFormValues) => void;
  onCancel: () => void;
};

export function TipoDeTurnoForm({ initialValues, onSave, onCancel }: TipoDeTurnoFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid, isDirty },
  } = useForm<TipoDeTurnoFormValues>({
    mode: "onChange",
    defaultValues: initialValues
      ? { titulo: initialValues.titulo, descripcion: initialValues.descripcion, precio: initialValues.precio }
      : undefined,
  });

  useEffect(() => {
    if (initialValues) {
      reset({ titulo: initialValues.titulo, descripcion: initialValues.descripcion, precio: initialValues.precio });
    } else {
      reset({ titulo: "", descripcion: "", precio: undefined });
    }
  }, [initialValues, reset]);

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] p-5 shadow-lg">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="form-title" className="font-heading text-lg text-[#253551] dark:text-[#93c5fd]">
            {initialValues ? "Editar tipo de turno" : "Nuevo tipo de turno"}
          </h2>
          <button
            onClick={onCancel}
            className="text-[#2A2829] dark:text-[#e2e8f0] hover:text-[#253551] transition-colors"
            aria-label="Cerrar formulario"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-5">
          {/* Título */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="titulo" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Título <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="titulo"
              type="text"
              placeholder="Ej: Consulta general"
              aria-invalid={!!errors.titulo}
              className={cn(
                "h-10 rounded-lg border bg-white dark:bg-[#0f172a] px-3 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
                "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
                errors.titulo ? "border-red-400" : "border-[#E0E0DB] dark:border-[#2d3548]"
              )}
              {...register("titulo", { required: "El título es obligatorio" })}
            />
            {errors.titulo && (
              <p role="alert" className="text-xs text-red-500">{errors.titulo.message}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="descripcion" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Descripción <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <textarea
              id="descripcion"
              rows={3}
              placeholder="Ej: Atención médica de primer nivel"
              aria-invalid={!!errors.descripcion}
              className={cn(
                "rounded-lg border bg-white dark:bg-[#0f172a] px-3 py-2 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors resize-none",
                "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
                errors.descripcion ? "border-red-400" : "border-[#E0E0DB] dark:border-[#2d3548]"
              )}
              {...register("descripcion", { required: "La descripción es obligatoria" })}
            />
            {errors.descripcion && (
              <p role="alert" className="text-xs text-red-500">{errors.descripcion.message}</p>
            )}
          </div>

          {/* Precio */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="precio" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Precio ($) <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <Controller
              name="precio"
              control={control}
              rules={{
                required: "El precio es obligatorio",
                validate: (value) => Number(value) > 0 || "El precio debe ser mayor a cero",
              }}
              render={({ field }) => (
                <NumericInput
                  id="precio"
                  value={field.value}
                  onChange={(val) => field.onChange(val ?? 0)}
                  placeholder="Ej: 5.000"
                  hasError={!!errors.precio}
                  aria-invalid={!!errors.precio}
                />
              )}
            />
            {errors.precio && (
              <p role="alert" className="text-xs text-red-500">{errors.precio.message}</p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={hasErrors || (!isDirty && !!initialValues)}
              className="flex-1 bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
            >
              {initialValues ? "Guardar cambios" : "Crear tipo de turno"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
