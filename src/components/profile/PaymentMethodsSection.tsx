"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  onTransferChange: (enabled: boolean) => void;
};

type PaymentState = {
  cashEnabled: boolean;
  transferEnabled: boolean;
};

export function PaymentMethodsSection({ onTransferChange }: Props) {
  const [state, setState] = useState<PaymentState>({ cashEnabled: true, transferEnabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal de advertencia
  const [pendingToggle, setPendingToggle] = useState<"cash" | "transfer" | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/business-profile/payment-methods")
      .then((r) => r.json())
      .then((data: PaymentState) => {
        setState(data);
        onTransferChange(data.transferEnabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = (state.cashEnabled ? 1 : 0) + (state.transferEnabled ? 1 : 0);

  async function handleToggle(method: "cash" | "transfer") {
    const currentValue = method === "cash" ? state.cashEnabled : state.transferEnabled;

    // Solo actuar si se intenta desactivar
    if (!currentValue) {
      // Reactivar directamente
      applyChange(method, true);
      return;
    }

    // Es el último activo — bloquear
    if (activeCount <= 1) return;

    // Consultar si hay turnos pendientes
    const res = await fetch(`/api/business-profile/payment-methods/pending-bookings?method=${method}`);
    const data: { hasPendingBookings: boolean; count: number } = await res.json();

    if (data.hasPendingBookings) {
      setPendingToggle(method);
      setPendingCount(data.count);
      setShowModal(true);
    } else {
      applyChange(method, false);
    }
  }

  async function applyChange(method: "cash" | "transfer", value: boolean) {
    const newState = {
      cashEnabled: method === "cash" ? value : state.cashEnabled,
      transferEnabled: method === "transfer" ? value : state.transferEnabled,
    };
    setState(newState);
    if (method === "transfer") onTransferChange(value);

    setSaving(true);
    await fetch("/api/business-profile/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [method === "cash" ? "cashEnabled" : "transferEnabled"]: value }),
    }).finally(() => setSaving(false));
  }

  function handleModalCancel() {
    setShowModal(false);
    setPendingToggle(null);
  }

  function handleModalConfirm() {
    if (pendingToggle) {
      applyChange(pendingToggle, false);
    }
    setShowModal(false);
    setPendingToggle(null);
  }

  if (loading) {
    return <div className="h-24 rounded-lg bg-[#E0E0DB] animate-pulse" />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
          Métodos de pago
        </span>

        {/* Efectivo */}
        <PaymentMethodRow
          label="Efectivo"
          description="El cliente abona en el momento del turno."
          enabled={state.cashEnabled}
          disabled={state.cashEnabled && activeCount <= 1}
          saving={saving}
          onToggle={() => handleToggle("cash")}
        />

        {/* Transferencia */}
        <PaymentMethodRow
          label="Transferencia bancaria"
          description="El cliente transfiere antes o durante el turno."
          enabled={state.transferEnabled}
          disabled={state.transferEnabled && activeCount <= 1}
          saving={saving}
          onToggle={() => handleToggle("transfer")}
        />

        {activeCount <= 1 && (
          <p className="text-xs text-[#2A2829]/50 dark:text-[#64748b]">
            Debe haber al menos un método de pago activo.
          </p>
        )}
      </div>

      {/* Modal de advertencia */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
        >
          <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex flex-col gap-4 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <h2
                id="payment-modal-title"
                className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0] leading-tight"
              >
                Turnos pendientes con este método
              </h2>
              <button
                onClick={handleModalCancel}
                className="p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
                aria-label="Cerrar"
              >
                <X size={16} className="text-[#2A2829] dark:text-[#94a3b8]" />
              </button>
            </div>

            <p className="font-body text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">
              Hay{" "}
              <span className="font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                {pendingCount} turno{pendingCount !== 1 ? "s" : ""}
              </span>{" "}
              pendiente{pendingCount !== 1 ? "s" : ""} con este método. Si lo desactivás, esos turnos no se verán afectados pero los clientes no podrán elegirlo al reservar.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleModalCancel}
                className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleModalConfirm}
                className="flex-1 font-body text-sm text-white bg-[var(--brand-color)] rounded-md py-2.5 hover:bg-[#1c2a40] transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PaymentMethodRow({
  label,
  description,
  enabled,
  disabled,
  saving,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#0f172a] px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">{label}</span>
        <span className="text-xs text-[#2A2829]/50 dark:text-[#64748b]">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${enabled ? "Desactivar" : "Activar"} ${label}`}
        disabled={disabled || saving}
        onClick={onToggle}
        className={`relative shrink-0 h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] ${
          disabled || saving ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
        } ${enabled ? "bg-[var(--brand-color)]" : "bg-[#E0E0DB] dark:bg-[#2d3548]"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
