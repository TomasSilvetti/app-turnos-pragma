"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import type { Empleado, EditEmpleadoValues, SucursalRef } from "./types";

type EditEmpleadoModalProps = {
  empleado: Empleado;
  sucursales: SucursalRef[];
  isSaving?: boolean;
  error?: string;
  isPropietario?: boolean;
  onSave: (data: EditEmpleadoValues) => void;
  onCancel: () => void;
};

export function EditEmpleadoModal({
  empleado,
  sucursales,
  isSaving,
  error,
  isPropietario,
  onSave,
  onCancel,
}: EditEmpleadoModalProps) {
  const initialSucursalIds = empleado.sucursales.map((s) => s.id);

  const rolDefault = isPropietario ? "propietario" : (empleado.rol as "administrador" | "empleado");

  const {
    handleSubmit,
    control,
    watch,
    reset,
    formState: { isValid },
  } = useForm<EditEmpleadoValues>({
    mode: "onChange",
    defaultValues: {
      rol: rolDefault,
      sucursalIds: initialSucursalIds,
    },
  });

  useEffect(() => {
    reset({
      rol: isPropietario ? "propietario" : (empleado.rol as "administrador" | "empleado"),
      sucursalIds: empleado.sucursales.map((s) => s.id),
    });
  }, [empleado, isPropietario, reset]);

  const currentValues = watch();
  const hasChanges = isPropietario
    ? JSON.stringify([...currentValues.sucursalIds].sort()) !== JSON.stringify([...initialSucursalIds].sort())
    : currentValues.rol !== empleado.rol ||
      JSON.stringify([...currentValues.sucursalIds].sort()) !== JSON.stringify([...initialSucursalIds].sort());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-empleado-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="edit-empleado-title" className="font-heading text-lg text-[var(--brand-color)] dark:text-[#93c5fd]">
            Editar empleado
          </h2>
          <button
            onClick={onCancel}
            className="text-[#2A2829] dark:text-[#e2e8f0] hover:text-[var(--brand-color)] transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] px-3 py-2">
          <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">{empleado.nombre}</p>
          <p className="text-xs text-[#2A2829]/60 dark:text-[#94a3b8]">{empleado.email}</p>
        </div>

        <form onSubmit={handleSubmit(onSave)} noValidate className="flex flex-col gap-4">
          {/* Rol */}
          {isPropietario ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">Rol</span>
              <span className="inline-flex w-fit items-center rounded-full bg-[var(--brand-color)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-color)] dark:bg-[#1e3a5f] dark:text-[#93c5fd]">
                Propietario
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                Rol
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
          )}

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
                  <div className="flex flex-col gap-2 rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] p-3">
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
              disabled={!isValid || !hasChanges || isSaving}
              className="flex-1 bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-40"
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
