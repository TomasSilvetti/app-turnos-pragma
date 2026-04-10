"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessProfileCreateFormValues = {
  nombre: string;
  direccion: string;
  telefono: string;
  cbu: string;
  alias: string;
};

type FieldErrors = Partial<Record<keyof BusinessProfileCreateFormValues, string>>;

export function BusinessProfileCreateForm({ onCreated }: { onCreated?: () => void } = {}) {
  const { update } = useSession();
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BusinessProfileCreateFormValues>({ mode: "onBlur" });

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setLogoError("Formato no válido. Solo se aceptan imágenes.");
      return;
    }
    setLogoError(null);
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function removeLogo() {
    setLogo(null);
    setLogoPreview(null);
    setLogoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFormSubmit(data: BusinessProfileCreateFormValues) {
    setSaveError(null);

    if (!logo) {
      setLogoError("El logo es obligatorio");
      return;
    }

    const formData = new FormData();
    formData.append("name", data.nombre);
    formData.append("address", data.direccion);
    formData.append("phone", data.telefono);
    formData.append("cbu", data.cbu);
    formData.append("alias", data.alias);
    formData.append("logo", logo);

    const res = await fetch("/api/business-profile", {
      method: "POST",
      body: formData,
    });

    if (res.status === 201) {
      await update();
      if (onCreated) {
        onCreated();
      } else {
        window.location.href = "/dashboard";
      }
      return;
    }

    const body = await res.json().catch(() => ({}));
    if (body.fields) {
      const fieldMap: Record<string, keyof BusinessProfileCreateFormValues> = {
        name: "nombre",
        address: "direccion",
        phone: "telefono",
        cbu: "cbu",
        alias: "alias",
      };
      const fieldErrors: FieldErrors = {};
      for (const f of body.fields as string[]) {
        const key = fieldMap[f];
        if (key) fieldErrors[key] = "Este campo es obligatorio";
      }
      for (const [field, message] of Object.entries(fieldErrors)) {
        setError(field as keyof BusinessProfileCreateFormValues, { message });
      }
    } else {
      setSaveError(body.error ?? "Ocurrió un error al guardar. Intentá de nuevo.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {/* Nombre del negocio */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
          Nombre del negocio
        </label>
        <input
          id="nombre"
          type="text"
          aria-invalid={!!errors.nombre}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            errors.nombre ? "border-red-400" : "border-slate-200"
          )}
          {...register("nombre", { required: "El nombre del negocio es obligatorio" })}
        />
        {errors.nombre && (
          <p role="alert" className="text-xs text-red-500">{errors.nombre.message}</p>
        )}
      </div>

      {/* Logo */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">Logo del negocio</span>
        {logoPreview ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreview}
              alt="Previsualización del logo"
              className="h-28 w-28 rounded-xl object-cover border border-slate-200"
            />
            <button
              type="button"
              aria-label="Eliminar logo"
              onClick={removeLogo}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Área de carga de logo. Arrastrá una imagen o hacé clic para seleccionar"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
              isDragging
                ? "border-indigo-500 bg-blue-50"
                : logoError
                ? "border-red-400 bg-white"
                : "border-slate-200 bg-slate-50 hover:border-indigo-500 hover:bg-white"
            )}
          >
            <Upload size={24} className="text-slate-400" />
            <p className="text-sm text-slate-500 text-center">
              <span className="font-medium text-indigo-600">Seleccioná una imagen</span>
              {" "}o arrastrala acá
            </p>
            <p className="text-xs text-slate-400">PNG, JPG, WEBP</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-label="Seleccionar imagen de logo"
          className="sr-only"
          onChange={handleFileInput}
        />
        {logoError && (
          <p role="alert" className="text-xs text-red-500">{logoError}</p>
        )}
      </div>

      {/* Dirección */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="direccion" className="text-sm font-medium text-slate-700">
          Dirección
        </label>
        <input
          id="direccion"
          type="text"
          aria-invalid={!!errors.direccion}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            errors.direccion ? "border-red-400" : "border-slate-200"
          )}
          {...register("direccion", { required: "La dirección es obligatoria" })}
        />
        {errors.direccion && (
          <p role="alert" className="text-xs text-red-500">{errors.direccion.message}</p>
        )}
      </div>

      {/* Teléfono */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefono" className="text-sm font-medium text-slate-700">
          Teléfono
        </label>
        <input
          id="telefono"
          type="tel"
          aria-invalid={!!errors.telefono}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
            errors.telefono ? "border-red-400" : "border-slate-200"
          )}
          {...register("telefono", { required: "El teléfono es obligatorio" })}
        />
        {errors.telefono && (
          <p role="alert" className="text-xs text-red-500">{errors.telefono.message}</p>
        )}
      </div>

      {/* CBU y Alias */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cbu" className="text-sm font-medium text-slate-700">
            CBU
          </label>
          <input
            id="cbu"
            type="text"
            inputMode="numeric"
            aria-invalid={!!errors.cbu}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
              errors.cbu ? "border-red-400" : "border-slate-200"
            )}
            {...register("cbu", {
              required: "El CBU es obligatorio",
              pattern: {
                value: /^\d{22}$/,
                message: "El CBU debe tener exactamente 22 dígitos",
              },
            })}
          />
          {errors.cbu && (
            <p role="alert" className="text-xs text-red-500">{errors.cbu.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alias" className="text-sm font-medium text-slate-700">
            Alias
          </label>
          <input
            id="alias"
            type="text"
            aria-invalid={!!errors.alias}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors",
              "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
              errors.alias ? "border-red-400" : "border-slate-200"
            )}
            {...register("alias", { required: "El alias es obligatorio" })}
          />
          {errors.alias && (
            <p role="alert" className="text-xs text-red-500">{errors.alias.message}</p>
          )}
        </div>
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-red-500 text-center">{saveError}</p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-1 w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
      >
        {isSubmitting ? "Guardando..." : "Configurar negocio"}
      </Button>
    </form>
  );
}
