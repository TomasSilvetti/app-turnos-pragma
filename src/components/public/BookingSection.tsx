"use client";

import { useState, useCallback, useEffect } from "react";
import { format, startOfMonth } from "date-fns";
import MiniCalendar from "./MiniCalendar";
import AppointmentSlots, { type Appointment } from "./AppointmentSlots";
import BookingModal from "./BookingModal";
import BookingConfirmation from "./BookingConfirmation";

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
  phone: string | null;
  paymentMethod: string | null;
};

type ClientSession = {
  clienteId: string;
  nombre: string;
  apellido: string;
  email: string;
};

type Sucursal = {
  id: string;
  name: string;
  address: string;
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
  phone: string | null;
  clientSession?: ClientSession | null;
  initialEmployeeId?: string | null;
  initialSucursales: Sucursal[];
};

export default function BookingSection({ slug, businessName, cbu, alias, phone, clientSession, initialEmployeeId, initialSucursales }: Props) {
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/public/business/${slug}/payment-methods`)
      .then((r) => r.json())
      .then((data: { methods: string[] }) => setPaymentMethods(data.methods ?? []))
      .catch(() => {});
  }, [slug]);

  // Sucursales (precargadas desde el server)
  const sucursales = initialSucursales;
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(
    initialSucursales.length === 1 ? initialSucursales[0].id : null
  );
  const sucursalesLoading = false;
  const sucursalesError = false;

  // Empleados por sucursal
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(initialEmployeeId ?? null);
  const [empleadosLoading, setEmpleadosLoading] = useState(false);

  // Cargar empleados cuando cambia la sucursal (client-side, lazy)
  useEffect(() => {
    if (!selectedSucursalId) {
      setEmployees([]);
      setSelectedEmployeeId(null);
      return;
    }
    setEmpleadosLoading(true);
    setEmployees([]);
    setSelectedEmployeeId(null);
    fetch(`/api/p/${slug}/branches/${selectedSucursalId}/employees`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data: Employee[]) => {
        setEmployees(data);
        if (data.length === 1) {
          setSelectedEmployeeId(data[0].id);
        }
      })
      .catch(() => setEmployees([]))
      .finally(() => setEmpleadosLoading(false));
  }, [slug, selectedSucursalId]);

  // Cargar slots cuando cambia el mes o el empleado
  useEffect(() => {
    if (!selectedEmployeeId) return;
    const month = format(viewMonth, "yyyy-MM");
    setIsLoadingSlots(true);
    const url = `/api/p/${slug}/availability?month=${month}&employeeId=${selectedEmployeeId}${selectedSucursalId ? `&sucursalId=${selectedSucursalId}` : ""}`;
    fetch(url)
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
  }, [slug, viewMonth, selectedEmployeeId, selectedSucursalId]);

  const handleSucursalSelect = useCallback((id: string) => {
    setSelectedSucursalId(id);
    setSelectedDate(null);
    setSelectedAppointment(null);
    setBookingError(null);
    setSlots([]);
  }, []);

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
    paymentMethod: string | null;
  }) {
    setIsBooking(true);
    setBookingError(null);

    try {
      const body: Record<string, string | null> = {
        appointmentId: data.appointmentId,
        ...(data.serviceTypeId && { serviceTypeId: data.serviceTypeId }),
        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
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
        phone,
        clientName: clientDisplayName,
        paymentMethod: data.paymentMethod,
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
        phone={bookingResult.phone}
        clientName={bookingResult.clientName}
        paymentMethod={bookingResult.paymentMethod}
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

      {/* Selector de sucursal */}
      {sucursalesLoading ? (
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 animate-pulse">
          <div className="h-4 w-40 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-3" />
          <div className="h-10 w-full bg-[#E0E0DB] dark:bg-[#2d3548] rounded-md" />
        </div>
      ) : sucursalesError ? (
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4">
          <p className="font-body text-sm text-[#ef4444]">
            No se pudieron cargar las sucursales. Por favor recargá la página.
          </p>
        </div>
      ) : sucursales.length === 0 ? (
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4">
          <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
            No hay sucursales disponibles en este momento.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
          <p className="font-body text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
            Seleccioná una sucursal
          </p>
          <div className="flex flex-col gap-2">
            {sucursales.map((s) => {
              const isSelected = selectedSucursalId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSucursalSelect(s.id)}
                  className={[
                    "flex flex-col rounded-md px-3 py-2.5 text-sm transition-colors text-left",
                    isSelected
                      ? "bg-[var(--brand-color)] text-white"
                      : "bg-[#F4F5F7] dark:bg-[#0f172a] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#E8E9EB] dark:hover:bg-[#1e293b]",
                  ].join(" ")}
                  aria-pressed={isSelected}
                >
                  <span className="font-body font-medium">{s.name}</span>
                  {s.address && (
                    <span
                      className={[
                        "font-body text-xs mt-0.5",
                        isSelected ? "text-white/70" : "text-[#2A2829]/50 dark:text-[#94a3b8]",
                      ].join(" ")}
                    >
                      {s.address}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selector de empleado (solo cuando hay sucursal seleccionada) */}
      {selectedSucursalId && (
        empleadosLoading ? (
          <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 animate-pulse">
            <div className="h-4 w-44 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-3" />
            <div className="h-10 w-full bg-[#E0E0DB] dark:bg-[#2d3548] rounded-md" />
          </div>
        ) : employees.length === 0 ? (
          <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4">
            <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
              No hay empleados disponibles en esta sucursal.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 flex flex-col gap-3">
            <p className="font-body text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              Seleccioná un profesional
            </p>
            <div className="flex flex-col gap-2">
              {employees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleEmployeeSelect(emp.id)}
                    className={[
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors text-left",
                      isSelected
                        ? "bg-[var(--brand-color)] text-white"
                        : "bg-[#F4F5F7] dark:bg-[#0f172a] text-[#2A2829] dark:text-[#cbd5e1] hover:bg-[#E8E9EB] dark:hover:bg-[#1e293b]",
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={[
                        "h-7 w-7 rounded-full flex items-center justify-center font-body text-xs font-semibold uppercase shrink-0",
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[var(--brand-color)]/10 text-[var(--brand-color)]",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {emp.name.charAt(0)}
                    </span>
                    <span className="font-body font-medium">{emp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Calendario y slots (solo cuando hay empleado seleccionado) */}
      {selectedEmployeeId && (
        <>
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
        </>
      )}

      {selectedAppointment && (
        <BookingModal
          appointment={selectedAppointment}
          serviceTypes={selectedAppointment.serviceTypes ?? []}
          paymentMethods={paymentMethods}
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
