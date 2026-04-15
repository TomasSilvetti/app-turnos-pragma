"use client";

import { useState, useCallback, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import MiniCalendar from "./MiniCalendar";
import AppointmentSlots, { type Appointment } from "./AppointmentSlots";
import BookingModal from "./BookingModal";
import BookingConfirmation from "./BookingConfirmation";
import EmployeeSelector from "./EmployeeSelector";

type Slot = {
  id: string;
  date: string;
  time: string;
  price: number;
  booked?: boolean;
  disabled?: boolean;
  serviceTypes?: { id: string; title: string; price: number }[];
};

type BookingResult = {
  businessName: string;
  date: string;
  time: string;
  price: number;
  cbu: string | null;
  alias: string | null;
  clientName: string | null;
};

type ClientSession = {
  clienteId: string;
  nombre: string;
  apellido: string;
  email: string;
};

type Employee = {
  id: string;
  name: string;
};

type Props = {
  slug: string;
  businessName: string;
  cbu: string | null;
  alias: string | null;
  clientSession?: ClientSession | null;
  initialEmployeeId?: string | null;
};

export default function BookingSection({ slug, businessName, cbu, alias, clientSession, initialEmployeeId }: Props) {
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalProviders, setTotalProviders] = useState<number>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(initialEmployeeId ?? null);

  // Cargar la lista de empleados del negocio
  useEffect(() => {
    fetch(`/api/p/${slug}/employees`)
      .then((res) => res.json())
      .then((data: { employees: Employee[]; totalProviders?: number }) => {
        const list = data.employees ?? [];
        setEmployees(list);
        setTotalProviders(data.totalProviders ?? list.length);
        // Si hay un initialEmployeeId válido lo mantenemos, sino elegimos el primero
        if (!initialEmployeeId && list.length > 0) {
          setSelectedEmployeeId(list[0].id);
        }
      })
      .catch(() => {});
  }, [slug, initialEmployeeId]);

  // Cargar slots cuando cambia el mes o el empleado seleccionado
  useEffect(() => {
    if (!selectedEmployeeId) return;
    const month = format(viewMonth, "yyyy-MM");
    setIsLoadingSlots(true);
    fetch(`/api/p/${slug}/availability?month=${month}&employeeId=${selectedEmployeeId}`)
      .then((res) => res.json())
      .then((data: { slots: Slot[] }) => {
        setSlots(data.slots ?? []);
        setSelectedDate((prev) => {
          const monthPrefix = format(viewMonth, "yyyy-MM");
          if (prev && prev.startsWith(monthPrefix)) return prev;
          return data.slots?.[0]?.date ?? null;
        });
      })
      .catch(() => setSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [slug, viewMonth, selectedEmployeeId]);

  const handleEmployeeSelect = useCallback((id: string) => {
    setSelectedEmployeeId(id);
    setSelectedDate(null);
    setSelectedAppointment(null);
    setBookingError(null);
    setSlots([]);
  }, []);

  const availableDates = [...new Set(slots.map((s) => s.date))];

  const appointmentsForDate: Appointment[] = slots
    .filter((s) => s.date === selectedDate)
    .map((s) => ({
      id: s.id,
      time: s.time,
      price: s.price,
      booked: s.booked || bookedIds.has(s.id),
      disabled: s.disabled,
      serviceTypes: s.serviceTypes,
    }));

  const handleMonthChange = useCallback((month: Date) => {
    setViewMonth(month);
    setSelectedDate(null);
    setSelectedAppointment(null);
    setBookingError(null);
  }, []);

  const handleDaySelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedAppointment(null);
    setBookingError(null);
  }, []);

  const handleAppointmentSelect = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setBookingError(null);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedAppointment(null);
    setBookingError(null);
  }, []);

  async function handleConfirm(data: {
    clientName: string;
    clientSurname: string;
    clientPhone: string;
    appointmentId: string;
    serviceTypeId: string | null;
  }) {
    setIsBooking(true);
    setBookingError(null);

    try {
      const body: Record<string, string | null> = {
        appointmentId: data.appointmentId,
        ...(data.serviceTypeId && { serviceTypeId: data.serviceTypeId }),
      };

      if (!clientSession) {
        body.clientName = data.clientName;
        body.clientSurname = data.clientSurname;
        body.clientPhone = data.clientPhone;
      }

      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al reservar el turno");
      }

      const appointment = appointmentsForDate.find((a) => a.id === data.appointmentId);
      if (!appointment) throw new Error("Turno no encontrado");

      const finalPrice = data.serviceTypeId
        ? (appointment.serviceTypes?.find((t) => t.id === data.serviceTypeId)?.price ?? appointment.price)
        : appointment.price;

      const clientDisplayName = clientSession
        ? `${clientSession.nombre} ${clientSession.apellido}`
        : `${data.clientName} ${data.clientSurname}`;

      setBookedIds((prev) => new Set([...prev, data.appointmentId]));
      setSelectedAppointment(null);
      setBookingResult({
        businessName,
        date: selectedDate!,
        time: appointment.time,
        price: finalPrice,
        cbu,
        alias,
        clientName: clientDisplayName,
      });
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : "El turno ya no está disponible. Por favor elegí otro."
      );
    } finally {
      setIsBooking(false);
    }
  }

  function handleBack() {
    setBookingResult(null);
  }

  if (bookingResult) {
    return (
      <BookingConfirmation
        businessName={bookingResult.businessName}
        date={bookingResult.date}
        time={bookingResult.time}
        price={bookingResult.price}
        cbu={bookingResult.cbu}
        alias={bookingResult.alias}
        clientName={bookingResult.clientName}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      {/* Banner de cliente autenticado */}
      {clientSession && (
        <div className="rounded-lg bg-white border border-[#E0E0DB] px-4 py-3 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--brand-color)]/10 flex items-center justify-center shrink-0">
            <span className="font-body text-xs font-semibold text-[var(--brand-color)] uppercase">
              {clientSession.nombre.charAt(0)}
            </span>
          </div>
          <p className="font-body text-sm text-[#2A2829] flex-1">
            Reservando como{" "}
            <span className="font-medium">
              {clientSession.nombre} {clientSession.apellido}
            </span>
          </p>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/clientes/logout", { method: "POST" });
              window.location.reload();
            }}
            className="font-body text-xs text-[#2A2829]/50 hover:text-[#ef4444] transition-colors shrink-0"
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Selector de empleado */}
      <EmployeeSelector
        employees={employees}
        totalProviders={totalProviders}
        selectedId={selectedEmployeeId}
        onSelect={handleEmployeeSelect}
      />

      <MiniCalendar
        availableDates={availableDates}
        selectedDate={selectedDate}
        viewMonth={viewMonth}
        onMonthChange={handleMonthChange}
        onDaySelect={handleDaySelect}
      />

      {isLoadingSlots ? (
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex items-center justify-center py-10">
          <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50 dark:opacity-70">Cargando turnos...</p>
        </div>
      ) : (
        <AppointmentSlots
          appointments={appointmentsForDate}
          onSelect={handleAppointmentSelect}
        />
      )}

      {selectedAppointment && (
        <BookingModal
          appointment={selectedAppointment}
          serviceTypes={selectedAppointment.serviceTypes ?? []}
          isLoading={isBooking}
          error={bookingError}
          onConfirm={handleConfirm}
          onClose={handleModalClose}
          clientSession={clientSession}
        />
      )}
    </>
  );
}
