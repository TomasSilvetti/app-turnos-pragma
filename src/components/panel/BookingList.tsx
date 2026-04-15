"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, MessageCircle, X, CheckCircle, ChevronDown, ChevronUp, XCircle, CalendarClock, Info, Users } from "lucide-react";
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

function buildCancellationUrl(item: BookingItem) {
  const formattedDate = format(parseISO(item.appointmentDate), "EEEE d 'de' MMMM", { locale: es });
  const phone = item.clientPhone.replace(/\D/g, "");
  const text = `Hola ${item.clientName}, lamentablemente debemos informarte que tu turno del ${formattedDate} a las ${item.appointmentTime} hs ha sido cancelado. Disculpá los inconvenientes.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

function CancelModal({
  item,
  onConfirm,
  onClose,
  isLoading,
}: {
  item: BookingItem;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [notified, setNotified] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#E0E0DB] dark:border-[#2d3548] shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-lg text-[#ef4444]">Cancelar turno</h3>
          <p className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0]">
            Estás por cancelar el turno de <strong>{item.clientName}</strong>. Una vez cancelado,{" "}
            <span className="font-semibold">debés notificar al cliente</span> para que esté al tanto.
          </p>
        </div>
        <a
          href={buildCancellationUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setNotified(true)}
          className="flex items-center justify-center gap-2 font-body text-sm text-white bg-[#25d366] rounded-md px-4 py-2.5 hover:bg-[#1ebe59] transition-colors"
        >
          <MessageCircle size={15} />
          Notificar al cliente por WhatsApp
        </a>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md px-4 py-2 hover:bg-[#eef1f6] dark:hover:bg-[#2d3548] transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={!notified || isLoading}
            title={!notified ? "Primero notificá al cliente por WhatsApp" : undefined}
            className="flex-1 font-body text-sm text-white bg-[#ef4444] rounded-md px-4 py-2 hover:bg-[#dc2626] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? "Cancelando..." : "Cancelar turno"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SendToRescheduleModal({
  item,
  onConfirm,
  onClose,
  isLoading,
  success,
}: {
  item: BookingItem;
  onConfirm: () => void;
  onClose: () => void;
  isLoading: boolean;
  success: boolean;
}) {
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#E0E0DB] dark:border-[#2d3548] shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-[var(--brand-color)]/10 p-3">
              <CalendarClock size={28} className="text-[var(--brand-color)]" />
            </div>
            <h3 className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0]">Turno enviado a reprogramación</h3>
            <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8]">
              El turno de <strong>{item.clientName}</strong> fue movido al módulo de{" "}
              <span className="font-semibold text-[var(--brand-color)]">Reprogramaciones</span>, donde podrás asignarle un nuevo horario.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-4 py-2.5 hover:bg-[#1c2a40] transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#E0E0DB] dark:border-[#2d3548] shadow-xl w-full max-w-sm p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h3 className="font-heading text-lg text-[#2A2829] dark:text-[#e2e8f0]">Reprogramar turno</h3>
          <p className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0]">
            Estás por enviar el turno de <strong>{item.clientName}</strong> al módulo de reprogramaciones. Allí podrás asignarle un nuevo horario disponible.
          </p>
          <div className="flex items-start gap-2 rounded-md bg-[var(--brand-color)]/5 border border-[var(--brand-color)]/20 px-3 py-2.5 mt-1">
            <Info size={15} className="text-[var(--brand-color)] shrink-0 mt-0.5" />
            <p className="font-body text-xs text-[#2A2829] dark:text-[#94a3b8]">
              El turno quedará reservado hasta que asignes el nuevo horario desde el módulo de Reprogramaciones.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] rounded-md px-4 py-2 hover:bg-[#eef1f6] dark:hover:bg-[#2d3548] transition-colors"
          >
            Volver
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-4 py-2 hover:bg-[#1c2a40] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Enviando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

type Empleado = { id: string; nombre: string; rol: string };

export default function BookingList() {
  const { data: session } = useSession();
  const userRol = (session?.user as { rol?: string } | undefined)?.rol ?? "propietario";
  const isAdmin = userRol === "propietario" || userRol === "administrador";

  const [items, setItems] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingItem | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<BookingItem | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date());

  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Empleado | null>(null);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/empleados")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Empleado[]) => setEmpleados(data))
      .catch(() => setEmpleados([]));
  }, [isAdmin]);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = selectedEmployee
        ? `/api/panel/bookings?employeeId=${selectedEmployee.id}`
        : "/api/panel/bookings";
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmployee]);

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

  async function handleSendToReschedule(bookingId: string) {
    setLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      setRescheduleSuccess(true);
      setItems((prev) => prev.filter((i) => i.bookingId !== bookingId));
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
      setCancelTarget(null);
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
      {cancelTarget && (
        <CancelModal
          item={cancelTarget}
          onConfirm={() => handleCancel(cancelTarget.bookingId)}
          onClose={() => setCancelTarget(null)}
          isLoading={loadingId === cancelTarget.bookingId}
        />
      )}
      {rescheduleTarget && (
        <SendToRescheduleModal
          item={rescheduleTarget}
          onConfirm={() => handleSendToReschedule(rescheduleTarget.bookingId)}
          onClose={() => { setRescheduleTarget(null); setRescheduleSuccess(false); }}
          isLoading={loadingId === rescheduleTarget.bookingId}
          success={rescheduleSuccess}
        />
      )}
      {/* Dropdown empleados — solo admins */}
      {isAdmin && empleados.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <button
              onClick={() => setEmployeeDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] rounded-xl px-4 py-2 hover:bg-[#eef1f6] dark:hover:bg-[#2d3548] transition-colors w-full sm:w-auto"
            >
              <Users size={15} className="text-[var(--brand-color)] shrink-0" />
              <span className="truncate">
                {selectedEmployee ? selectedEmployee.nombre : "Ver turnos de empleado"}
              </span>
              {employeeDropdownOpen ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
            </button>

            {employeeDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] rounded-xl shadow-lg min-w-[220px] overflow-hidden">
                {selectedEmployee && (
                  <button
                    onClick={() => { setSelectedEmployee(null); setEmployeeDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 font-body text-sm text-[#ef4444] hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition-colors border-b border-[#E0E0DB] dark:border-[#2d3548]"
                  >
                    <XCircle size={14} />
                    Ver mis turnos
                  </button>
                )}
                {empleados.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmployee(emp); setEmployeeDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 font-body text-sm text-left transition-colors ${
                      selectedEmployee?.id === emp.id
                        ? "bg-[var(--brand-color)]/10 text-[var(--brand-color)]"
                        : "text-[#2A2829] dark:text-[#e2e8f0] hover:bg-[#eef1f6] dark:hover:bg-[#2d3548]"
                    }`}
                  >
                    <span className="flex-1 truncate">{emp.nombre}</span>
                    <span className="font-small text-xs opacity-50 shrink-0 capitalize">{emp.rol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedEmployee && (
            <p className="font-small text-xs text-[var(--brand-color)] dark:text-[#93c5fd]">
              Modo lectura — turnos de {selectedEmployee.nombre}
            </p>
          )}
        </div>
      )}

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
                  selectedEmployee ? null : (
                    <>
                      <button
                        onClick={() => handleConfirmPayment(item.bookingId)}
                        disabled={loadingId === item.bookingId}
                        className="flex items-center gap-1.5 font-body text-sm text-white bg-[var(--brand-color)] rounded-md px-3 py-2 hover:bg-[#1c2a40] transition-colors disabled:opacity-50"
                        aria-label="Marcar como pagado"
                      >
                        <CheckCircle size={15} />
                        Pago
                      </button>
                      <button
                        onClick={() => { setRescheduleTarget(item); setRescheduleSuccess(false); }}
                        disabled={loadingId === item.bookingId}
                        className="flex items-center gap-1.5 font-body text-sm text-[var(--brand-color)] border border-[var(--brand-color)] rounded-md px-3 py-2 hover:bg-[var(--brand-color)]/5 dark:hover:bg-[var(--brand-color)]/10 transition-colors disabled:opacity-50"
                        aria-label="Reprogramar turno"
                      >
                        <CalendarClock size={15} />
                        Reprogramar
                      </button>
                      <button
                        onClick={() => setCancelTarget(item)}
                        disabled={loadingId === item.bookingId}
                        className="flex items-center justify-center text-[#ef4444] border border-[#ef4444] rounded-md p-2 hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition-colors disabled:opacity-50"
                        aria-label="Cancelar turno"
                      >
                        <X size={15} />
                      </button>
                    </>
                  )
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
                  selectedEmployee ? null : (
                    <>
                      <button
                        onClick={() => { setRescheduleTarget(item); setRescheduleSuccess(false); }}
                        disabled={loadingId === item.bookingId}
                        className="flex items-center gap-1.5 font-body text-sm text-[var(--brand-color)] border border-[var(--brand-color)] rounded-md px-3 py-2 hover:bg-[var(--brand-color)]/5 dark:hover:bg-[var(--brand-color)]/10 transition-colors disabled:opacity-50"
                        aria-label="Reprogramar turno"
                      >
                        <CalendarClock size={15} />
                        Reprogramar
                      </button>
                      <button
                        onClick={() => handleCancel(item.bookingId)}
                        disabled={loadingId === item.bookingId}
                        className="flex items-center justify-center text-[#ef4444] border border-[#ef4444] rounded-md p-2 hover:bg-[#fef2f2] dark:hover:bg-[#ef4444]/10 transition-colors disabled:opacity-50"
                        aria-label="Cancelar turno"
                      >
                        <X size={15} />
                      </button>
                    </>
                  )
                }
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
