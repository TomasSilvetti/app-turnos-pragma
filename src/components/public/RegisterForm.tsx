"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/ui/CustomSelect";

type Props = {
  slug: string;
  onSwitchToLogin: () => void;
  employeeId?: string | null;
};

type FormData = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  sexo: string;
  edad: string;
  password: string;
};

function validate(data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!data.nombre.trim()) errors.nombre = "El nombre es obligatorio";
  if (!data.apellido.trim()) errors.apellido = "El apellido es obligatorio";
  if (!data.email.trim()) {
    errors.email = "El email es obligatorio";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "El formato del email no es válido";
  }
  if (!data.telefono.trim()) {
    errors.telefono = "El teléfono es obligatorio";
  } else if (!/^\+[\d\s\-()]{7,20}$/.test(data.telefono.trim())) {
    errors.telefono = "Incluí el prefijo internacional. Ej: +54 9 11 1234-5678";
  }
  if (!data.sexo) errors.sexo = "El sexo es obligatorio";
  if (!data.edad) {
    errors.edad = "La edad es obligatoria";
  } else {
    const age = Number(data.edad);
    if (isNaN(age) || age < 1 || age > 120)
      errors.edad = "La edad debe estar entre 1 y 120";
  }
  if (!data.password) {
    errors.password = "La contraseña es obligatoria";
  } else if (data.password.length < 8) {
    errors.password = "La contraseña debe tener al menos 8 caracteres";
  }
  return errors;
}

const inputClass = (hasError: boolean) =>
  `w-full font-body text-sm text-[#2A2829] border rounded-md px-3 py-2 outline-none focus:border-[var(--brand-color)] transition-colors bg-white placeholder:text-[#2A2829]/30 ${
    hasError ? "border-[#ef4444]" : "border-[#E0E0DB]"
  }`;

const labelClass =
  "font-body text-xs text-[#2A2829] font-medium uppercase tracking-wide";

export default function RegisterForm({ slug, onSwitchToLogin, employeeId }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    sexo: "",
    edad: "",
    password: "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormData, boolean>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailDuplicate, setEmailDuplicate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const errors = validate(formData);
  const isValid = Object.keys(errors).length === 0;

  function handleChange(field: keyof FormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "email") setEmailDuplicate(false);
    setServerError(null);
  }

  function handleBlur(field: keyof FormData) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function showError(field: keyof FormData): string | null {
    if (!touched[field]) return null;
    if (field === "email" && emailDuplicate) return null;
    return errors[field] ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Mark all as touched on submit
    setTouched({ nombre: true, apellido: true, email: true, telefono: true, sexo: true, edad: true, password: true });
    if (!isValid) return;

    setIsLoading(true);
    setServerError(null);
    setEmailDuplicate(false);

    try {
      const res = await fetch("/api/clientes/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: formData.email.trim(),
          telefono: formData.telefono.trim(),
          sexo: formData.sexo,
          edad: Number(formData.edad),
          password: formData.password,
        }),
      });

      if (res.status === 409) {
        setEmailDuplicate(true);
        setTouched((prev) => ({ ...prev, email: true }));
        return;
      }
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setServerError(json.error ?? "Error al crear la cuenta. Intentá de nuevo.");
        return;
      }

      router.push(employeeId ? `/turnos/${slug}?employee=${employeeId}` : `/turnos/${slug}`);
      router.refresh();
    } catch {
      setServerError("Error de conexión. Intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Nombre */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-nombre" className={labelClass}>
          Nombre <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="reg-nombre"
          type="text"
          value={formData.nombre}
          onChange={(e) => handleChange("nombre", e.target.value)}
          onBlur={() => handleBlur("nombre")}
          autoComplete="given-name"
          placeholder="Tu nombre"
          className={inputClass(!!showError("nombre"))}
        />
        {showError("nombre") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("nombre")}</p>
        )}
      </div>

      {/* Apellido */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-apellido" className={labelClass}>
          Apellido <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="reg-apellido"
          type="text"
          value={formData.apellido}
          onChange={(e) => handleChange("apellido", e.target.value)}
          onBlur={() => handleBlur("apellido")}
          autoComplete="family-name"
          placeholder="Tu apellido"
          className={inputClass(!!showError("apellido"))}
        />
        {showError("apellido") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("apellido")}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-email" className={labelClass}>
          Email <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="reg-email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          autoComplete="email"
          placeholder="tu@email.com"
          className={inputClass(!!showError("email") || emailDuplicate)}
        />
        {showError("email") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("email")}</p>
        )}
        {emailDuplicate && (
          <p className="font-body text-xs text-[#ef4444]">
            Ya existe una cuenta con este email.{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline underline-offset-2 hover:text-[#c73333] transition-colors"
            >
              Iniciá sesión
            </button>
          </p>
        )}
      </div>

      {/* Teléfono */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-telefono" className={labelClass}>
          Teléfono (WhatsApp) <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="reg-telefono"
          type="tel"
          value={formData.telefono}
          onChange={(e) => handleChange("telefono", e.target.value)}
          onBlur={() => handleBlur("telefono")}
          autoComplete="tel"
          placeholder="+54 9 11 1234-5678"
          className={inputClass(!!showError("telefono"))}
        />
        {showError("telefono") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("telefono")}</p>
        )}
      </div>

      {/* Sexo */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-sexo" className={labelClass}>
          Sexo <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <CustomSelect
          id="reg-sexo"
          value={formData.sexo}
          onChange={(val) => handleChange("sexo", val)}
          onBlur={() => handleBlur("sexo")}
          placeholder="Seleccioná una opción"
          hasError={!!showError("sexo")}
          options={[
            { value: "masculino", label: "Masculino" },
            { value: "femenino", label: "Femenino" },
            { value: "otro", label: "Otro" },
            { value: "prefiero_no_decir", label: "Prefiero no decir" },
          ]}
        />
        {showError("sexo") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("sexo")}</p>
        )}
      </div>

      {/* Edad */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-edad" className={labelClass}>
          Edad <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="reg-edad"
          type="number"
          value={formData.edad}
          onChange={(e) => handleChange("edad", e.target.value)}
          onBlur={() => handleBlur("edad")}
          min={1}
          max={120}
          placeholder="Ej: 25"
          className={inputClass(!!showError("edad"))}
        />
        {showError("edad") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("edad")}</p>
        )}
      </div>

      {/* Contraseña */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-password" className={labelClass}>
          Contraseña <span aria-hidden="true" className="text-[#ef4444]">*</span>
        </label>
        <input
          id="reg-password"
          type="password"
          value={formData.password}
          onChange={(e) => handleChange("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className={inputClass(!!showError("password"))}
        />
        {showError("password") && (
          <p className="font-body text-xs text-[#ef4444]">{showError("password")}</p>
        )}
      </div>

      {serverError && (
        <p
          role="alert"
          className="font-body text-xs text-[#ef4444] bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-md px-3 py-2"
        >
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed mt-1"
      >
        {isLoading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
