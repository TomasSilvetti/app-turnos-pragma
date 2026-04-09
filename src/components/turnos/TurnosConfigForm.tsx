"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TurnosConfigFormValues = {
  horaInicio: string;
  horaFin: string;
  intervalo: number;
  precio: number;
};

type TurnosConfigFormProps = {
  initialValues?: Partial<TurnosConfigFormValues>;
  onSubmit: (data: TurnosConfigFormValues) => Promise<{ error?: string } | void>;
};

export function TurnosConfigForm({ initialValues, onSubmit }: TurnosConfigFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TurnosConfigFormValues>({
    mode: "onBlur",
    defaultValues: initialValues,
  });

  const values = watch();
  const allFilled = !!(values.horaInicio && values.horaFin && values.intervalo && values.precio);

  async function handleFormSubmit(data: TurnosConfigFormValues) {
    await onSubmit(data);
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {/* Horas — grid 2 columnas */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Hora de inicio */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="horaInicio" className="text-sm font-medium text-[#2A2829]">
            Hora de inicio
          </label>
          <input
            id="horaInicio"
            type="time"
            aria-invalid={!!errors.horaInicio}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.horaInicio ? "border-red-400" : "border-[#E0E0DB]"
            )}
            {...register("horaInicio", { required: "La hora de inicio es obligatoria" })}
          />
          {errors.horaInicio && (
            <p role="alert" className="text-xs text-red-500">
              {errors.horaInicio.message}
            </p>
          )}
        </div>

        {/* Hora de fin */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="horaFin" className="text-sm font-medium text-[#2A2829]">
            Hora de fin
          </label>
          <input
            id="horaFin"
            type="time"
            aria-invalid={!!errors.horaFin}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.horaFin ? "border-red-400" : "border-[#E0E0DB]"
            )}
            {...register("horaFin", {
              required: "La hora de fin es obligatoria",
              validate: (value) => {
                const inicio = watch("horaInicio");
                if (inicio && value <= inicio) {
                  return "La hora de fin debe ser posterior a la hora de inicio";
                }
                return true;
              },
            })}
          />
          {errors.horaFin && (
            <p role="alert" className="text-xs text-red-500">
              {errors.horaFin.message}
            </p>
          )}
        </div>
      </div>

      {/* Intervalo y precio — grid 2 columnas */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Intervalo */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="intervalo" className="text-sm font-medium text-[#2A2829]">
            Intervalo (minutos)
          </label>
          <input
            id="intervalo"
            type="number"
            inputMode="numeric"
            placeholder="Ej: 30"
            aria-invalid={!!errors.intervalo}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.intervalo ? "border-red-400" : "border-[#E0E0DB]"
            )}
            {...register("intervalo", {
              required: "El intervalo es obligatorio",
              validate: (value) => {
                const num = Number(value);
                if (!Number.isInteger(num) || num <= 0) {
                  return "El intervalo debe ser un número entero positivo";
                }
                return true;
              },
            })}
          />
          {errors.intervalo && (
            <p role="alert" className="text-xs text-red-500">
              {errors.intervalo.message}
            </p>
          )}
        </div>

        {/* Precio */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="precio" className="text-sm font-medium text-[#2A2829]">
            Precio por turno ($)
          </label>
          <input
            id="precio"
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="Ej: 5000"
            aria-invalid={!!errors.precio}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.precio ? "border-red-400" : "border-[#E0E0DB]"
            )}
            {...register("precio", {
              required: "El precio es obligatorio",
              validate: (value) => {
                if (Number(value) <= 0) {
                  return "El precio debe ser mayor a cero";
                }
                return true;
              },
            })}
          />
          {errors.precio && (
            <p role="alert" className="text-xs text-red-500">
              {errors.precio.message}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!allFilled || isSubmitting}
        className="mt-1 w-full bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Guardando..." : "Guardar configuración"}
      </Button>
    </form>
  );
}
