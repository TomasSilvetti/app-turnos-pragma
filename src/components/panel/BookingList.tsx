"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, MessageCircle, X, CheckCircle, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import MiniCalendar from "@/components/public/MiniCalendar";

export type BookingItem = {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  status: "pending" | "confirmed";
  appointmentDate: string;
  appointmentTime: string;
  serviceTypeTitle: string;
  serviceTypePrice: number | null;
};

function SkeletonRow() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-[#E0E0DB] dark:border-[#2d3548] animate-pulse">
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-36 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
        <div className="h-3 w-24 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3.5 w-28 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
        <div className="h-3 w-40 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-24 bg-[#E0E0DB] rounded-md" />
        <div className="h-9 w-9 bg-[#E0E0DB] rounded-md" />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
      <CalendarCheck size={32} className="text-[#E0E0DB]" aria-hidden="true" />
      <p className="font-body text-sm text-[#2A2829] opacity-50">{label}</p>
    </div>
  );
}

function BookingRow({
  item,
  actions,
}: {
  item: BookingItem;
  actions: React.ReactNode;
}) {
  const formattedDate = format(parseISO(item.appointmentDate), "EEE d MMM", { locale: es });
  const formattedPrice =
    item.serviceTypePrice !== null
      ? new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        }).format(item.serviceTypePrice)
      : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 border-b border-[#E0E0DB] dark:border-[#2d3548] last:border-b-0 hover:bg-[#eef1f6] dark:hover:bg-[#1e293b] transition-colors">
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium truncate">{item.clientName}</span>
        <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100">{item.clientPhone}</span>
      </div>
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] truncate capitalize">
          {formattedDate} · {item.appointmentTime} hs
        </span>
        <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100">
          {item.serviceTypeTitle}
          {formattedPrice !== null && ` · ${formattedPrice}`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">{actions}</div>
    </div>
  );
}

function buildReminderUrl(item: BookingItem) {
  const formattedDate = format(parseISO(item.appointmentDate), "EEEE d 'de' MMMM", { locale: es });
  const phone = item.clientPhone.replace(/\D/g, "");
  const text = `Hola ${item.clientName}, te recordamos tu turno el ${formattedDate} a las ${item.appointmentTime} hs. ¡Te esperamos!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export default function BookingList() {
  const [items, setItems] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/panel/bookings");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleConfirmPayment(bookingId: string) {
    setLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) => (i.bookingId === bookingId ? { ...i, status: "confirmed" } : i))
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancel(bookingId: string) {
    setLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.bookingId !== bookingId));
    } finally {
      setLoadingId(null);
    }
  }

  const availableDates = [...new Set(items.map((i) => i.appointmentDate))];

  const filteredItems = selectedDate
    ? items.filter((i) => i.appointmentDate === selectedDate)
    : items;

  const pending = filteredItems.filter((i) => i.status === "pending");
  const confirmed = filteredItems.filter((i) => i.status === "confirmed");

  return (
    <div className="flex flex-col gap-8">
      {/* Dropdown calendario */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCalendarOpen((prev) => !prev)}
            className="flex items-center gap-2 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] rounded-lg px-4 py-2 hover:bg-[#eef1f6] dark:hover:bg-[#2d3548] transition-colors"
          >
            <CalendarCheck size={15} className="text-[var(--brand-color)]" />
            {calendarOpen ? "Ocultar calendario" : "Mostrar calendario"}
            {calendarOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1.5 font-body text-sm text-[#ef4444] border border-[#ef4444] rounded-lg px-3 py-2 hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition-colors"
            >
              <XCircle size={14} />
              Quitar selección
            </button>
          )}
        </div>

        {calendarOpen && (
          <div className="max-w-xs">
            <MiniCalendar
              availableDates={availableDates}
              selectedDate={selectedDate}
              viewMonth={viewMonth}
              onMonthChange={setViewMonth}
              onDaySelect={(date) => {
                setSelectedDate((prev) => (prev === date ? null : date));
              }}
            />
          </div>
        )}
      </div>
      {/* Pendientes de pago */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-[var(--brand-color)] dark:text-[#93c5fd] uppercase tracking-wide">
          Pendientes de pago
          {!isLoading && pending.length > 0 && (
            <span className="ml-2 text-xs font-bold bg-[var(--brand-color)] text-white rounded-full px-2 py-0.5">
              {pending.length}
            </span>
          )}
        </h2>
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] overflow-hidden">
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : pending.length === 0 ? (
            <EmptyState label="No hay turnos pendientes de pago." />
          ) : (
            pending.map((item) => (
              <BookingRow
                key={item.bookingId}
                item={item}
                actions={
                  <button
                    onClick={() => handleConfirmPayment(item.bookingId)}
                    disabled={loadingId === item.bookingId}
                    className="flex items-center gap-1.5 font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-3 py-2 hover:bg-[#1c2a40] transition-colors disabled:opacity-50"
                    aria-label="Marcar como pagado"
                  >
                    <CheckCircle size={15} />
                    Pago
                  </button>
                }
              />
            ))
          )}
        </div>
      </section>

      {/* Confirmados */}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-base text-[var(--brand-color)] dark:text-[#93c5fd] uppercase tracking-wide">
          Confirmados
          {!isLoading && confirmed.length > 0 && (
            <span className="ml-2 text-xs font-bold bg-[var(--brand-color)] text-white rounded-full px-2 py-0.5">
              {confirmed.length}
            </span>
          )}
        </h2>
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] overflow-hidden">
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : confirmed.length === 0 ? (
            <EmptyState label="No hay turnos confirmados." />
          ) : (
            confirmed.map((item) => (
              <BookingRow
                key={item.bookingId}
                item={item}
                actions={
                  <>
                    <a
                      href={buildReminderUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-body text-sm text-white bg-[#25d366] rounded-md px-3 py-2 hover:bg-[#1ebe59] transition-colors"
                      aria-label="Recordar turno por WhatsApp"
                    >
                      <MessageCircle size={15} />
                      Recordar
                    </a>
                    <button
                      onClick={() => handleCancel(item.bookingId)}
                      disabled={loadingId === item.bookingId}
                      className="flex items-center justify-center text-[#ef4444] border border-[#ef4444] rounded-md p-2 hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition-colors disabled:opacity-50"
                      aria-label="Cancelar turno"
                    >
                      <X size={15} />
                    </button>
                  </>
                }
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
