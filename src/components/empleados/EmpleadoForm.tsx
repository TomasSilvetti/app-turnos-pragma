"use client";

import { useForm, Controller } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { cn } from "@/lib/utils";
import type { EmpleadoFormValues, SucursalRef } from "./types";

type EmpleadoFormProps = {
  sucursales: SucursalRef[];
  isSaving?: boolean;
  error?: string;
  onSave: (data: EmpleadoFormValues) => void;
  onCancel: () => void;
};

export function EmpleadoForm({ sucursales, isSaving, error, onSave, onCancel }: EmpleadoFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<EmpleadoFormValues>({
    mode: "onChange",
    defaultValues: {
      nombre: "",
      email: "",
      password: "",
      rol: "empleado",
      sucursalIds: [],
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="empleado-form-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="empleado-form-title" className="font-heading text-lg text-[var(--brand-color)] dark:text-[#93c5fd]">
            Nuevo empleado
          </h2>
          <button
            onClick={onCancel}
            className="text-[#2A2829] dark:text-[#e2e8f0] hover:text-[var(--brand-color)] transition-colors"
            aria-label="Cerrar formulario"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-4">
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Nombre <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              placeholder="Ej: Juan Pérez"
              aria-invalid={!!errors.nombre}
              className={cn(
                "h-10 rounded-lg border bg-white dark:bg-[#080c14] px-3 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
                "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
                errors.nombre ? "border-red-400" : "border-[#E0E0DB] dark:border-[#1a2840]"
              )}
              {...register("nombre", { required: "El nombre es obligatorio" })}
            />
            {errors.nombre && (
              <p role="alert" className="text-xs text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Email <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="Ej: juan@empresa.com"
              aria-invalid={!!errors.email}
              className={cn(
                "h-10 rounded-lg border bg-white dark:bg-[#080c14] px-3 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
                "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
                errors.email ? "border-red-400" : "border-[#E0E0DB] dark:border-[#1a2840]"
              )}
              {...register("email", {
                required: "El email es obligatorio",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email inválido" },
              })}
            />
            {errors.email && (
              <p role="alert" className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Contraseña inicial <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              aria-invalid={!!errors.password}
              className={cn(
                "h-10 rounded-lg border bg-white dark:bg-[#080c14] px-3 text-sm text-[#2A2829] dark:text-[#e2e8f0] placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors",
                "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
                errors.password ? "border-red-400" : "border-[#E0E0DB] dark:border-[#1a2840]"
              )}
              {...register("password", {
                required: "La contraseña es obligatoria",
                minLength: { value: 6, message: "Mínimo 6 caracteres" },
              })}
            />
            {errors.password && (
              <p role="alert" className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Rol */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Rol <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <Controller
              name="rol"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={[
                    { value: "empleado", label: "Empleado" },
                    { value: "administrador", label: "Administrador" },
                  ]}
                />
              )}
            />
          </div>

          {/* Sucursales */}
          {sucursales.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                Sucursales
              </span>
              <Controller
                name="sucursalIds"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col gap-2 rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] p-3">
                    {sucursales.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={s.id}
                          checked={field.value.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, s.id]);
                            } else {
                              field.onChange(field.value.filter((id) => id !== s.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-[#E0E0DB] text-[var(--brand-color)] focus:ring-[var(--brand-color)]/20"
                        />
                        <span className="text-sm text-[#2A2829] dark:text-[#e2e8f0]">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          )}

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
              {isSaving ? "Guardando..." : "Crear empleado"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
