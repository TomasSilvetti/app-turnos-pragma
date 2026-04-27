"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Appointment } from "./AppointmentSlots";

type ServiceType = { id: string; title: string; price: number };

type ClientSession = {
  clienteId: string;
  nombre: string;
  apellido: string;
  email: string;
};

type Props = {
  appointment: Appointment;
  serviceTypes: ServiceType[];
  paymentMethods: string[];
  isLoading: boolean;
  error: string | null;
  onConfirm: (data: {
    clientName: string;
    clientSurname: string;
    clientPhone: string;
    appointmentId: string;
    serviceTypeId: string | null;
    paymentMethod: string | null;
  }) => void;
  onClose: () => void;
  clientSession?: ClientSession | null;
};

export default function BookingModal({
  appointment,
  serviceTypes,
  paymentMethods,
  isLoading,
  error,
  onConfirm,
  onClose,
  clientSession,
}: Props) {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);

  // Método de pago: si hay más de uno, el cliente elige; si hay uno, se asigna automático
  const showPaymentSelector = paymentMethods.length > 1;
  const autoPaymentMethod = paymentMethods.length === 1 ? paymentMethods[0] : null;
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus al montar
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const hasServiceTypes = serviceTypes.length > 0;
  const displayPrice = hasServiceTypes && selectedServiceTypeId
    ? (serviceTypes.find((t) => t.id === selectedServiceTypeId)?.price ?? appointment.price)
    : appointment.price;

  const isAuthenticated = !!clientSession;

  const paymentValid = !showPaymentSelector || selectedPaymentMethod !== null;

  const isValid = isAuthenticated
    ? (!hasServiceTypes || selectedServiceTypeId !== null) && paymentValid
    : name.trim() !== "" &&
      surname.trim() !== "" &&
      phone.trim() !== "" &&
      (!hasServiceTypes || selectedServiceTypeId !== null) &&
      paymentValid;

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isLoading) return;
    onConfirm({
      clientName: isAuthenticated ? clientSession!.nombre : name.trim(),
      clientSurname: isAuthenticated ? clientSession!.apellido : surname.trim(),
      clientPhone: isAuthenticated ? "" : phone.trim(),
      appointmentId: appointment.id,
      serviceTypeId: selectedServiceTypeId,
      paymentMethod: autoPaymentMethod ?? selectedPaymentMethod,
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#0c1220] border border-[#E0E0DB] dark:border-[#1a2840] p-5 flex flex-col gap-5 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id="modal-title"
              className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0] leading-tight"
            >
              Confirmar reserva
            </h2>
            <p className="font-body text-sm text-[var(--brand-color)] font-medium mt-0.5">
              {appointment.time} — ${displayPrice.toLocaleString("es-AR")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#1a2840] transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X size={18} className="text-[#2A2829] dark:text-[#94a3b8]" />
          </button>
        </div>

        {/* Selector de tipo de turno */}
        {hasServiceTypes && (
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide">
              Tipo de turno <span aria-hidden="true" className="text-[#ef4444]">*</span>
            </p>
            <div className="flex flex-col gap-2">
              {serviceTypes.map((type) => {
                const isSelected = selectedServiceTypeId === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedServiceTypeId(type.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--brand-color)] bg-[var(--brand-color)]/5"
                        : "border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#253045] hover:bg-[#F4F5F7] dark:hover:bg-[#1a2840]"
                    }`}
                  >
                    <span className={`font-body text-sm ${isSelected ? "text-[var(--brand-color)] font-medium" : "text-[#2A2829] dark:text-[#e2e8f0]"}`}>
                      {type.title}
                    </span>
                    <span className={`font-body text-sm font-medium ${isSelected ? "text-[var(--brand-color)]" : "text-[#2A2829] dark:text-[#e2e8f0]"}`}>
                      ${type.price.toLocaleString("es-AR")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selector de método de pago */}
        {showPaymentSelector && (
          <div className="flex flex-col gap-2">
            <p className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide">
              ¿Cómo vas a abonar? <span aria-hidden="true" className="text-[#ef4444]">*</span>
            </p>
            <div className="flex flex-col gap-2">
              {paymentMethods.map((method) => {
                const isSelected = selectedPaymentMethod === method;
                const label = method === "cash" ? "Efectivo" : "Transferencia bancaria";
                const desc = method === "cash"
                  ? "Abonás en el momento del turno."
                  : "Pagás antes del turno.";
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method)}
                    aria-pressed={isSelected}
                    className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-[var(--brand-color)] bg-[var(--brand-color)]/5"
                        : "border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#253045] hover:bg-[#F4F5F7] dark:hover:bg-[#1a2840]"
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? "border-[var(--brand-color)]" : "border-[#E0E0DB] dark:border-[#64748b]"
                    }`}>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-[var(--brand-color)]" />
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`font-body text-sm font-medium ${isSelected ? "text-[var(--brand-color)]" : "text-[#2A2829] dark:text-[#e2e8f0]"}`}>
                        {label}
                      </span>
                      <span className="font-body text-xs text-[#2A2829]/50 dark:text-[#64748b]">
                        {desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {isAuthenticated ? (
            /* Flujo autenticado: mostrar nombre del cliente sin campos editables */
            <div className="rounded-md bg-[#F4F5F7] dark:bg-[#151e2d] border border-[#E0E0DB] dark:border-[#1a2840] px-3 py-2.5">
              <p className="font-body text-xs text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide mb-0.5">
                Reservando como
              </p>
              <p className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium">
                {clientSession!.nombre} {clientSession!.apellido}
              </p>
            </div>
          ) : (
            <>
              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="booking-name"
                  className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide"
                >
                  Nombre <span aria-hidden="true" className="text-[#ef4444]">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  id="booking-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#1a2840] rounded-md px-3 py-2 outline-none focus:border-[var(--brand-color)] transition-colors bg-white dark:bg-[#253045] placeholder:text-[#2A2829]/30 dark:placeholder:text-[#94a3b8]/50"
                />
              </div>

              {/* Apellido */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="booking-surname"
                  className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide"
                >
                  Apellido <span aria-hidden="true" className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="booking-surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#1a2840] rounded-md px-3 py-2 outline-none focus:border-[var(--brand-color)] transition-colors bg-white dark:bg-[#253045] placeholder:text-[#2A2829]/30 dark:placeholder:text-[#94a3b8]/50"
                />
              </div>

              {/* Teléfono */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="booking-phone"
                  className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8] font-medium uppercase tracking-wide"
                >
                  Teléfono <span aria-hidden="true" className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="booking-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 11 1234-5678"
                  autoComplete="tel"
                  className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#1a2840] rounded-md px-3 py-2 outline-none focus:border-[var(--brand-color)] transition-colors bg-white dark:bg-[#253045] placeholder:text-[#2A2829]/30 dark:placeholder:text-[#94a3b8]/50"
                />
              </div>
            </>
          )}

          {/* Error del backend */}
          {error && (
            <p
              role="alert"
              className="font-body text-xs text-[#ef4444] bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-md px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#1a2840] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#1a2840] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid || isLoading}
              className="flex-1 font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? "Reservando..." : "Confirmar reserva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
