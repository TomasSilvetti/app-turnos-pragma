"use client";

import { useState, useMemo, useEffect } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { Button } from "@/components/ui/button";
import { TimePicker24h } from "@/components/ui/TimePicker24h";

export type ServiceTypeOption = {
  id: string;
  title: string;
  duracion: number; // minutos
  description?: string | null;
  price?: number;
};

export type ExistingAppointment = {
  time: string; // "HH:mm"
  duracion: number; // minutos
};

type Gap = { from: string; to: string };

type Props = {
  startTime: string; // "HH:mm" — inicio del horario de atención
  endTime: string; // "HH:mm" — fin del horario de atención
  gaps?: Gap[];
  serviceTypes: ServiceTypeOption[];
  appointments: ExistingAppointment[];
  paymentMethods: string[];
  onConfirm: (
    startTime: string,
    endTime: string,
    serviceTypeId: string,
    paymentMethod: string | null
  ) => void;
  onPreviewChange?: (preview: { time: string; duracion: number } | null) => void;
  confirmLabel?: string;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hasOverlap(
  newStartMin: number,
  newEndMin: number,
  appointments: ExistingAppointment[]
): boolean {
  return appointments.some((appt) => {
    const aStart = timeToMinutes(appt.time);
    const aEnd = aStart + appt.duracion;
    return newStartMin < aEnd && newEndMin > aStart;
  });
}

function overlapsGap(newStartMin: number, newEndMin: number, gaps?: Gap[]): boolean {
  if (!gaps) return false;
  return gaps.some((gap) => {
    const gapStart = timeToMinutes(gap.from);
    const gapEnd = timeToMinutes(gap.to);
    return newStartMin < gapEnd && newEndMin > gapStart;
  });
}

function formatPrice(price: number): string {
  if (price === 0) return "Gratuito";
  return `$${price.toLocaleString("es-AR")}`;
}

export default function DayScheduleBookingForm({
  startTime,
  endTime,
  gaps,
  serviceTypes,
  appointments,
  paymentMethods,
  onConfirm,
  onPreviewChange,
  confirmLabel = "Confirmar reserva",
}: Props) {
  const [inputTime, setInputTime] = useState("");
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const selectedService = serviceTypes.find((s) => s.id === serviceTypeId);

  useEffect(() => {
    const preview =
      inputTime && /^\d{2}:\d{2}$/.test(inputTime) && selectedService
        ? { time: inputTime, duracion: selectedService.duracion }
        : null;
    onPreviewChange?.(preview);
  }, [inputTime, selectedService, onPreviewChange]);

  const validation = useMemo(() => {
    if (!inputTime || !selectedService) return null;

    if (!/^\d{2}:\d{2}$/.test(inputTime)) {
      return { error: "Ingresá el horario en formato HH:MM (ej: 10:30)" };
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const newStartMin = timeToMinutes(inputTime);
    const newEndMin = newStartMin + selectedService.duracion;

    if (newStartMin < startMin) {
      return { error: `El horario de inicio no puede ser antes de las ${startTime}` };
    }

    if (newEndMin > endMin) {
      return {
        error: `El turno finaliza fuera del horario de atención (hasta ${endTime})`,
        endTime: minutesToLabel(newEndMin),
      };
    }

    if (overlapsGap(newStartMin, newEndMin, gaps)) {
      return { error: "El horario seleccionado cae en un período sin cobertura" };
    }

    if (hasOverlap(newStartMin, newEndMin, appointments)) {
      return {
        error: "El horario seleccionado se superpone con un turno ya reservado",
        endTime: minutesToLabel(newEndMin),
      };
    }

    return { endTime: minutesToLabel(newEndMin) };
  }, [inputTime, selectedService, startTime, endTime, gaps, appointments]);

  const needsPaymentMethod = paymentMethods.length > 0;
  const canConfirm =
    !!inputTime &&
    !!serviceTypeId &&
    !!validation &&
    !validation.error &&
    (!needsPaymentMethod || !!paymentMethod);

  function handleConfirm() {
    if (!canConfirm || !validation?.endTime) return;
    onConfirm(inputTime, validation.endTime, serviceTypeId, paymentMethod || null);
  }

  const serviceTypeOptions = serviceTypes.map((s) => ({
    value: s.id,
    label: `${s.title} (${s.duracion} min)`,
  }));

  const paymentMethodOptions = paymentMethods.map((m) => ({
    value: m,
    label: m === "cash" ? "Efectivo" : m === "transfer" ? "Transferencia" : m,
  }));

  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex flex-col gap-5">
      <h2 className="font-heading text-xs text-gray-400 dark:text-[#64748b] uppercase tracking-widest">
        Elegir turno
      </h2>

      {/* Input horario de inicio */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="booking-start-time"
          className="font-body text-sm text-foreground dark:text-[#e2e8f0]"
        >
          Horario de inicio
        </label>
        <TimePicker24h
          id="booking-start-time"
          value={inputTime}
          onChange={setInputTime}
          hasError={!!validation?.error}
          minTime={startTime}
          maxTime={endTime}
          gaps={gaps}
        />
      </div>

      {/* Selector de tipo de turno */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="booking-service-type"
          className="font-body text-sm text-foreground dark:text-[#e2e8f0]"
        >
          Tipo de turno
        </label>
        <CustomSelect
          id="booking-service-type"
          options={serviceTypeOptions}
          value={serviceTypeId}
          onChange={setServiceTypeId}
          placeholder="Seleccioná un tipo de turno"
        />
        {/* Detalle del servicio seleccionado */}
        {selectedService && (
          <div className="rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] border border-[#E0E0DB] dark:border-[#2d3548] px-4 py-3 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-xs text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider">
                Duración
              </span>
              <span className="font-heading text-sm font-semibold text-[#2A2829] dark:text-[#e2e8f0]">
                {selectedService.duracion} min
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-xs text-gray-500 dark:text-[#94a3b8] uppercase tracking-wider">
                Precio
              </span>
              <span className="font-heading text-sm font-semibold text-[var(--brand-color)] dark:text-[#93c5fd]">
                {formatPrice(selectedService.price ?? 0)}
              </span>
            </div>
            {selectedService.description && (
              <p className="font-body text-xs text-gray-500 dark:text-[#64748b] mt-0.5">
                {selectedService.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Selector de método de pago */}
      {needsPaymentMethod && (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="booking-payment-method"
            className="font-body text-sm text-foreground dark:text-[#e2e8f0]"
          >
            Método de pago
          </label>
          <CustomSelect
            id="booking-payment-method"
            options={paymentMethodOptions}
            value={paymentMethod}
            onChange={setPaymentMethod}
            placeholder="Seleccioná un método de pago"
          />
        </div>
      )}

      {/* Horario de fin calculado */}
      {validation?.endTime && (
        <div className="flex items-center gap-2 rounded-lg bg-surface dark:bg-[#253045] border border-[#E0E0DB] dark:border-[#2d3548] px-4 py-2.5">
          <span className="font-body text-sm text-gray-500 dark:text-[#94a3b8]">
            Fin estimado:
          </span>
          <span className="font-heading text-sm text-[var(--brand-color)] dark:text-[#93c5fd]">
            {validation.endTime}
          </span>
        </div>
      )}

      {/* Mensaje de error */}
      {validation?.error && (
        <p
          id="booking-error"
          role="alert"
          className="font-body text-sm text-red-500 dark:text-red-400"
        >
          {validation.error}
        </p>
      )}

      {/* Botón confirmar */}
      <Button
        onClick={handleConfirm}
        disabled={!canConfirm}
        aria-disabled={!canConfirm}
        className="w-full"
      >
        {confirmLabel}
      </Button>
    </div>
  );
}
