"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Upload, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessProfileCreateForm } from "@/components/profile/BusinessProfileCreateForm";

type ProfileData = {
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  cbu: string | null;
  alias: string | null;
  slug: string;
};

export type BusinessProfileEditFormValues = {
  nombre: string;
  direccion: string;
  telefono: string;
  cbu: string;
  alias: string;
};

type FieldErrors = Partial<Record<keyof BusinessProfileEditFormValues, string>>;

export function BusinessProfileEditForm() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BusinessProfileEditFormValues>({ mode: "onBlur" });

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/business-profile");
      if (res.status === 404) {
        setProfileNotFound(true);
        return;
      }
      if (!res.ok) throw new Error("No se pudo cargar el perfil");
      const data: ProfileData = await res.json();
      setProfileData(data);
      reset({
        nombre: data.name,
        direccion: data.address ?? "",
        telefono: data.phone ?? "",
        cbu: data.cbu ?? "",
        alias: data.alias ?? "",
      });
      if (data.logoUrl) setLogoPreview(data.logoUrl);
    } catch {
      setFetchError("No se pudo cargar el perfil. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProfile(); }, []);

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

  async function handleFormSubmit(data: BusinessProfileEditFormValues) {
    setSaveSuccess(false);
    setSaveError(null);

    const formData = new FormData();
    formData.append("name", data.nombre);
    formData.append("address", data.direccion);
    formData.append("phone", data.telefono);
    formData.append("cbu", data.cbu);
    formData.append("alias", data.alias);
    if (logo) formData.append("logo", logo);

    const res = await fetch("/api/business-profile", {
      method: "PATCH",
      body: formData,
    });

    if (res.ok) {
      const updated: ProfileData = await res.json();
      setProfileData(updated);
      if (!logo && updated.logoUrl) setLogoPreview(updated.logoUrl);
      setSaveSuccess(true);
    } else {
      const body = await res.json().catch(() => ({}));
      if (body.fields) {
        const fieldMap: Record<string, keyof BusinessProfileEditFormValues> = {
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
          setError(field as keyof BusinessProfileEditFormValues, { message });
        }
      } else {
        setSaveError(body.error ?? "Ocurrió un error al guardar. Intentá de nuevo.");
      }
    }
  }

  async function copyPublicLink() {
    if (!profileData) return;
    const baseUrl = window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/turnos/${profileData.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-[#E0E0DB]" />
        ))}
      </div>
    );
  }

  if (profileNotFound) {
    return (
      <BusinessProfileCreateForm
        onCreated={() => {
          setProfileNotFound(false);
          setLoading(true);
          loadProfile();
        }}
      />
    );
  }

  if (fetchError) {
    return (
      <p role="alert" className="text-sm text-red-500 text-center">
        {fetchError}
      </p>
    );
  }

  const publicLink = profileData
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/turnos/${profileData.slug}`
    : "";

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {/* Link público */}
      {profileData && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#2A2829]">Tu link público</span>
          <div className="flex items-center gap-2 rounded-lg border border-[#E0E0DB] bg-[#F4F5F7] px-3 h-10">
            <span className="text-sm text-slate-500 truncate flex-1 font-small">
              /turnos/{profileData.slug}
            </span>
            <button
              type="button"
              onClick={copyPublicLink}
              aria-label="Copiar link público"
              className="shrink-0 text-[#253551] hover:text-[#1c2a40] transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-[#22c55e]">Link copiado al portapapeles</p>
          )}
        </div>
      )}

      {/* Nombre del negocio */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-[#2A2829]">
          Nombre del negocio
        </label>
        <input
          id="nombre"
          type="text"
          aria-invalid={!!errors.nombre}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
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
                ? "border-[#253551] bg-blue-50"
                : logoError
                ? "border-red-400 bg-white"
                : "border-[#E0E0DB] bg-[#F4F5F7] hover:border-[#253551] hover:bg-white"
            )}
          >
            <Upload size={24} className="text-slate-400" />
            <p className="text-sm text-slate-500 text-center">
              <span className="font-medium text-[#253551]">Seleccioná una imagen</span>
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
        <label htmlFor="direccion" className="text-sm font-medium text-[#2A2829]">
          Dirección
        </label>
        <input
          id="direccion"
          type="text"
          aria-invalid={!!errors.direccion}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
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
          aria-invalid={!!errors.telefono}
          className={cn(
            "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors",
            "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
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

      {/* CBU y Alias */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cbu" className="text-sm font-medium text-[#2A2829]">
            CBU
          </label>
          <input
            id="cbu"
            type="text"
            inputMode="numeric"
            aria-invalid={!!errors.cbu}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors font-small",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
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
            <p role="alert" className="text-xs text-red-500">{errors.cbu.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alias" className="text-sm font-medium text-[#2A2829]">
            Alias
          </label>
          <input
            id="alias"
            type="text"
            aria-invalid={!!errors.alias}
            className={cn(
              "h-10 rounded-lg border bg-white px-3 text-sm text-[#2A2829] placeholder:text-slate-400 outline-none transition-colors font-small",
              "focus:border-[#253551] focus:ring-2 focus:ring-[#253551]/20",
              errors.alias ? "border-red-400" : "border-[#E0E0DB]"
            )}
            {...register("alias", { required: "El alias es obligatorio" })}
          />
          {errors.alias && (
            <p role="alert" className="text-xs text-red-500">{errors.alias.message}</p>
          )}
        </div>
      </div>

      {/* Feedback global */}
      {saveSuccess && (
        <p role="status" className="text-sm text-[#22c55e] text-center">
          Perfil actualizado
        </p>
      )}
      {saveError && (
        <p role="alert" className="text-sm text-red-500 text-center">
          {saveError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="mt-1 w-full bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-40"
      >
        {isSubmitting ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
