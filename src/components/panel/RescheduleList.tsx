"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, User, Loader2, MessageCircle, X, AlertCircle } from "lucide-react";
import RescheduleModal from "./RescheduleModal";

export type RescheduleItem = {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  appointmentType: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string;
};

type ClientRescheduleItem = {
  id: string;
  bookingId: string;
  clientName: string;
  clientPhone: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  requestedDate: string;
  requestedTime: string;
};

function SkeletonRow() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-[#E0E0DB] dark:border-[#2d3548] animate-pulse">
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-40 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
        <div className="h-3 w-24 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-32 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
        <div className="h-3 w-44 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
      </div>
      <div className="h-9 w-full sm:w-28 bg-[#E0E0DB] dark:bg-[#2d3548] rounded-md" />
    </div>
  );
}

type RejectModalProps = {
  item: ClientRescheduleItem;
  onClose: () => void;
  onRejected: (id: string) => void;
};

function RejectModal({ item, onClose, onRejected }: RejectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappData, setWhatsappData] = useState<{
    clientPhone: string;
    whatsappMessage: string;
    clientDisplayName: string;
  } | null>(null);
  const [messageText, setMessageText] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  async function handleReject() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/panel/reschedule-requests/${item.id}/reject`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al rechazar la solicitud");
      }
      const data = await res.json();
      setWhatsappData(data);
      setMessageText(data.whatsappMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar la solicitud");
    } finally {
      setIsLoading(false);
    }
  }

  function buildWhatsAppUrl() {
    if (!whatsappData) return "#";
    const phone = whatsappData.clientPhone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const originalDate = format(parseISO(item.appointmentDate), "dd/MM/yyyy");
  const requestedDate = format(parseISO(item.requestedDate), "dd/MM/yyyy");

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] shadow-lg flex flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2
            id="reject-modal-title"
            className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]"
          >
            Rechazar solicitud
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} className="text-[#2A2829] dark:text-[#e2e8f0]" />
          </button>
        </div>

        {!whatsappData ? (
          <>
            <div className="rounded-lg bg-[#F4F5F7] dark:bg-[#0f172a] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-1.5 text-xs font-body">
              <p className="font-medium text-[#2A2829] dark:text-[#e2e8f0]">{item.clientName}</p>
              <div className="flex gap-2 text-[#2A2829]/50 dark:text-[#64748b]">
                <span>Turno original:</span>
                <span>{originalDate} · {item.appointmentTime} hs</span>
              </div>
              <div className="flex gap-2 text-[var(--brand-color)] dark:text-[#93c5fd]">
                <span>Solicitó mover a:</span>
                <span>{requestedDate} · {item.requestedTime} hs</span>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-[#ef4444]/5 border border-[#ef4444]/20 px-3 py-2"
              >
                <AlertCircle size={16} className="text-[#ef4444] shrink-0 mt-0.5" aria-hidden="true" />
                <p className="font-body text-xs text-[#ef4444]">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isLoading}
                className="flex-1 font-body text-sm text-white bg-[#ef4444] rounded-md py-2.5 hover:bg-[#dc2626] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={14} className="animate-spin" />}
                {isLoading ? "Rechazando..." : "Rechazar"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-body text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
              Solicitud rechazada. ¿Querés notificar al cliente por WhatsApp?
            </p>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="reject-whatsapp-msg"
                className="font-body text-xs text-[#2A2829]/50 dark:text-[#64748b] uppercase tracking-wide"
              >
                Mensaje (editable)
              </label>
              <textarea
                id="reject-whatsapp-msg"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md px-3 py-2 bg-white dark:bg-[#0f172a] resize-none"
              />
            </div>

            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { onRejected(item.id); onClose(); }}
              className="flex items-center justify-center gap-2 w-full font-body text-sm text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-md py-2.5 transition-colors"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Notificar por WhatsApp
            </a>

            <button
              type="button"
              onClick={() => { onRejected(item.id); onClose(); }}
              className="w-full font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md py-2.5 hover:bg-[#F4F5F7] dark:hover:bg-[#2d3548] transition-colors"
            >
              Omitir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function RescheduleList() {
  const [items, setItems] = useState<RescheduleItem[]>([]);
  const [clientItems, setClientItems] = useState<ClientRescheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RescheduleItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ClientRescheduleItem | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resReschedules, resClientRequests] = await Promise.all([
        fetch("/api/panel/reschedules"),
        fetch("/api/panel/reschedule-requests"),
      ]);
      const [reschedules, clientRequests] = await Promise.all([
        resReschedules.ok ? resReschedules.json() : [],
        resClientRequests.ok ? resClientRequests.json() : [],
      ]);
      setItems(reschedules);
      setClientItems(clientRequests);
    } catch {
      setItems([]);
      setClientItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function handleRescheduled(bookingId: string) {
    setSelectedItem(null);
    setItems((prev) => prev.filter((i) => i.bookingId !== bookingId));
  }

  async function handleApprove(item: ClientRescheduleItem) {
    setApprovingId(item.id);
    setApproveError(null);
    try {
      const res = await fetch(`/api/panel/reschedule-requests/${item.id}/approve`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "No se pudo aprobar la solicitud");
      }
      setClientItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : "Error al aprobar");
    } finally {
      setApprovingId(null);
    }
  }

  const totalItems = items.length + clientItems.length;

  return (
    <>
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] overflow-hidden">
        {/* Header de tabla */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto] bg-[var(--brand-color)] text-white text-xs uppercase tracking-[0.05em] font-body px-4 py-2.5">
          <span>Cliente</span>
          <span>Turno original</span>
          <span className="w-48" />
        </div>

        {approveError && (
          <div
            role="alert"
            className="flex items-start gap-2 px-4 py-3 bg-[#ef4444]/5 border-b border-[#ef4444]/20"
          >
            <AlertCircle size={16} className="text-[#ef4444] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="font-body text-sm text-[#ef4444]">{approveError}</p>
          </div>
        )}

        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
            <CalendarClock size={36} className="text-[#E0E0DB]" aria-hidden="true" />
            <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50">
              No hay reprogramaciones pendientes.
            </p>
          </div>
        ) : (
          <>
            {/* Reprogramaciones iniciadas por el empleado */}
            {items.map((item) => {
              const formattedDate = format(
                parseISO(item.appointmentDate),
                "EEEE d 'de' MMMM",
                { locale: es }
              );
              return (
                <div
                  key={item.bookingId}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-[#E0E0DB] dark:border-[#2d3548] last:border-b-0 hover:bg-[#eef1f6] dark:hover:bg-[#1e293b] transition-colors"
                >
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium truncate">
                      {item.clientName}
                    </span>
                    <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100">
                      {item.clientPhone}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] truncate">
                      {item.appointmentType}
                    </span>
                    <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100 capitalize">
                      {formattedDate}, {item.appointmentTime} hs
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="shrink-0 font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-4 py-2 hover:bg-[#1c2a40] transition-colors w-full sm:w-auto"
                  >
                    Reprogramar
                  </button>
                </div>
              );
            })}

            {/* Solicitudes iniciadas por el cliente */}
            {clientItems.map((item) => {
              const originalDate = format(parseISO(item.appointmentDate), "dd/MM/yyyy");
              const requestedDate = format(parseISO(item.requestedDate), "dd/MM/yyyy");
              const isApproving = approvingId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-[#E0E0DB] dark:border-[#2d3548] last:border-b-0 hover:bg-[#eef1f6] dark:hover:bg-[#1e293b] transition-colors"
                >
                  {/* Cliente con badge de solicitud */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium truncate">
                        {item.clientName}
                      </span>
                      <span className="inline-flex items-center gap-1 font-small text-[10px] font-medium text-[var(--brand-color)] dark:text-[#93c5fd] bg-[var(--brand-color)]/10 px-1.5 py-0.5 rounded-full shrink-0">
                        <User size={9} aria-hidden="true" />
                        Solicitud de cliente
                      </span>
                    </div>
                    <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100">
                      {item.clientPhone}
                    </span>
                  </div>

                  {/* Fechas */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="flex gap-1.5 items-center">
                      <span className="font-small text-[10px] text-[#2A2829]/40 dark:text-[#64748b] uppercase tracking-wide">antes</span>
                      <span className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8]">{originalDate} · {item.appointmentTime} hs</span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <span className="font-small text-[10px] text-[var(--brand-color)] dark:text-[#93c5fd] uppercase tracking-wide">pide</span>
                      <span className="font-body text-xs text-[var(--brand-color)] dark:text-[#93c5fd] font-medium">{requestedDate} · {item.requestedTime} hs</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={isApproving}
                      className="flex-1 sm:flex-none font-body text-sm text-white bg-[#22c55e] rounded-md px-3 py-2 hover:bg-[#16a34a] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
                    >
                      {isApproving && <Loader2 size={13} className="animate-spin" />}
                      {isApproving ? "..." : "Aprobar"}
                    </button>
                    <button
                      onClick={() => setRejectTarget(item)}
                      disabled={isApproving}
                      className="flex-1 sm:flex-none font-body text-sm text-[#ef4444] border border-[#ef4444]/30 rounded-md px-3 py-2 hover:bg-[#ef4444]/5 transition-colors disabled:opacity-40"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {selectedItem && (
        <RescheduleModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRescheduled={handleRescheduled}
        />
      )}

      {rejectTarget && (
        <RejectModal
          item={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={(id) => setClientItems((prev) => prev.filter((i) => i.id !== id))}
        />
      )}
    </>
  );
}
