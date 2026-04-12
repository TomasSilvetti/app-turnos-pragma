"use client";

import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BusinessProfileFormValues = {
  nombre: string;
  direccion: string;
  telefono: string;
  cbu: string;
  alias: string;
};

type FieldErrors = Partial<Record<keyof BusinessProfileFormValues, string>>;

type BusinessProfileFormProps = {
  onSubmit: (
    data: BusinessProfileFormValues,
    logo: File | null
  ) => Promise<{ fieldErrors?: FieldErrors }>;
};

export function BusinessProfileForm({ onSubmit }: BusinessProfileFormProps) {
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BusinessProfileFormValues>({ mode: "onBlur" });

  const values = watch();
  const allFilled = !!(
    values.nombre &&
    values.direccion &&
    values.telefono &&
    values.cbu &&
    values.alias
  );

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

  async function handleFormSubmit(data: BusinessProfileFormValues) {
    const result = await onSubmit(data, logo);
    if (result?.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof BusinessProfileFormValues, { message });
      }
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
        <label htmlFor="nombre" className="text-sm font-medium text-[#2A2829]">
          Nombre del negocio
        </label>
        <input
          id="nombre"
          type="text"
          placeholder="Ej: Peluquería Estilo"
          aria-invalid={!!errors.nombre}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
            errors.nombre ? "border-red-400" : "border-[#E0E0DB]"
          )}
          {...register("nombre", { required: "El nombre del negocio es obligatorio" })}
        />
        {errors.nombre && (
          <p role="alert" className="text-xs text-red-500">
            {errors.nombre.message}
          </p>
        )}
      </div>

      {/* Logo */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[#2A2829]">Logo del negocio</span>

        {logoPreview ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreview}
              alt="Previsualización del logo del negocio"
              className="h-28 w-28 rounded-xl object-cover border border-[#E0E0DB]"
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
                ? "border-[var(--brand-color)] bg-blue-50"
                : logoError
                ? "border-red-400 bg-white"
                : "border-[#E0E0DB] bg-[#F4F5F7] hover:border-[var(--brand-color)] hover:bg-white"
            )}
          >
            <Upload size={24} className="text-slate-400" />
            <p className="text-sm text-slate-500 text-center">
              <span className="font-medium text-[var(--brand-color)]">Seleccioná una imagen</span>
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
          <p role="alert" className="text-xs text-red-500">
            {logoError}
          </p>
        )}
      </div>

      {/* Dirección */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="direccion" className="text-sm font-medium text-[#2A2829]">
          Dirección
        </label>
        <input
          id="direccion"
          type="text"
          placeholder="Ej: Av. Corrientes 1234, CABA"
          aria-invalid={!!errors.direccion}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
            errors.direccion ? "border-red-400" : "border-[#E0E0DB]"
          )}
          {...register("direccion", { required: "La dirección es obligatoria" })}
        />
        {errors.direccion && (
          <p role="alert" className="text-xs text-red-500">
            {errors.direccion.message}
          </p>
        )}
      </div>

      {/* Teléfono */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefono" className="text-sm font-medium text-[#2A2829]">
          Teléfono
        </label>
        <input
          id="telefono"
          type="tel"
          placeholder="Ej: 11 1234-5678"
          aria-invalid={!!errors.telefono}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
            errors.telefono ? "border-red-400" : "border-[#E0E0DB]"
          )}
          {...register("telefono", { required: "El teléfono es obligatorio" })}
        />
        {errors.telefono && (
          <p role="alert" className="text-xs text-red-500">
            {errors.telefono.message}
          </p>
        )}
      </div>

      {/* CBU y Alias en grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* CBU */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cbu" className="text-sm font-medium text-[#2A2829]">
            CBU
          </label>
          <input
            id="cbu"
            type="text"
            inputMode="numeric"
            placeholder="22 dígitos"
            aria-invalid={!!errors.cbu}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors font-small",
              "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
              errors.cbu ? "border-red-400" : "border-[#E0E0DB]"
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
            <p role="alert" className="text-xs text-red-500">
              {errors.cbu.message}
            </p>
          )}
        </div>

        {/* Alias */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alias" className="text-sm font-medium text-[#2A2829]">
            Alias
          </label>
          <input
            id="alias"
            type="text"
            placeholder="Ej: mi.negocio.cbu"
            aria-invalid={!!errors.alias}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors font-small",
              "focus:border-[var(--brand-color)] focus:ring-2 focus:ring-[var(--brand-color)]/20",
              errors.alias ? "border-red-400" : "border-[#E0E0DB]"
            )}
            {...register("alias", { required: "El alias es obligatorio" })}
          />
          {errors.alias && (
            <p role="alert" className="text-xs text-red-500">
              {errors.alias.message}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!allFilled || isSubmitting}
        className="mt-1 w-full bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  );
}
