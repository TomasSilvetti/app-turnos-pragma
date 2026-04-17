"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import MiniCalendar from "./MiniCalendar";
import AppointmentSlots, { type Appointment } from "./AppointmentSlots";
import BookingModal from "./BookingModal";
import BookingConfirmation from "./BookingConfirmation";
import ClientBookingOptionsModal from "./ClientBookingOptionsModal";
import ClientRescheduleModal from "./ClientRescheduleModal";
import DayScheduleColumn, { type ScheduledAppointment } from "./DayScheduleColumn";
import DayScheduleBookingForm, { type ServiceTypeOption } from "./DayScheduleBookingForm";

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

type ClientBooking = {
  bookingId: string;
  date: string;
  time: string;
  serviceType: string;
  minAdvanceHours: number;
  employeeId: string;
};

type Sucursal = {
  id: string;
  name: string;
  address: string;
};

type Employee = {
  id: string;
  name: string;
  modoTurno?: "FIJO" | "POR_TIPO";
};

type DayScheduleData = {
  startTime: string;
  endTime: string;
  appointments: ScheduledAppointment[];
  serviceTypes: ServiceTypeOption[]; // ServiceTypeOption ya incluye description y price
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
  const [clientBookings, setClientBookings] = useState<ClientBooking[]>([]);
  const [clientBookingOptionsTarget, setClientBookingOptionsTarget] = useState<ClientBooking | null>(null);
  const [clientRescheduleTarget, setClientRescheduleTarget] = useState<ClientBooking | null>(null);

  useEffect(() => {
    fetch(`/api/public/business/${slug}/payment-methods`)
      .then((r) => r.json())
      .then((data: { methods: string[] }) => setPaymentMethods(data.methods ?? []))
      .catch(() => {});
  }, [slug]);

  const fetchClientBookings = useCallback(() => {
    if (!clientSession) return;
    fetch(`/api/client/bookings?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: ClientBooking[]) => setClientBookings(data))
      .catch(() => {});
  }, [slug, clientSession]);

  useEffect(() => {
    fetchClientBookings();
  }, [fetchClientBookings]);

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

  // Estado para el flujo POR_TIPO
  const [daySchedule, setDaySchedule] = useState<DayScheduleData | null>(null);
  const [isLoadingDaySchedule, setIsLoadingDaySchedule] = useState(false);
  const [porTipoBookingError, setPorTipoBookingError] = useState<string | null>(null);
  const [porTipoBookingLoading, setPorTipoBookingLoading] = useState(false);
  const [porTipoDaysOfWeek, setPorTipoDaysOfWeek] = useState<number[] | null>(null);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const isPorTipo = selectedEmployee?.modoTurno === "POR_TIPO";

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

  // Cargar días de semana configurados para empleados POR_TIPO
  useEffect(() => {
    if (!isPorTipo || !selectedEmployeeId) {
      setPorTipoDaysOfWeek(null);
      return;
    }
    fetch(`/api/p/${slug}/employees/${selectedEmployeeId}/schedule-days`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { daysOfWeek: number[] } | null) =>
        setPorTipoDaysOfWeek(data?.daysOfWeek ?? null)
      )
      .catch(() => setPorTipoDaysOfWeek(null));
  }, [slug, isPorTipo, selectedEmployeeId]);

  // Cargar day-schedule para empleados POR_TIPO cuando cambia la fecha
  useEffect(() => {
    if (!isPorTipo || !selectedEmployeeId || !selectedDate) {
      setDaySchedule(null);
      return;
    }
    setIsLoadingDaySchedule(true);
    fetch(
      `/api/p/${slug}/employees/${selectedEmployeeId}/day-schedule?date=${selectedDate}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: DayScheduleData | null) => setDaySchedule(data))
      .catch(() => setDaySchedule(null))
      .finally(() => setIsLoadingDaySchedule(false));
  }, [slug, isPorTipo, selectedEmployeeId, selectedDate]);

  // Cargar slots cuando cambia el mes o el empleado
  const fetchSlots = useCallback(() => {
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

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Ref para acceder siempre al fetchSlots más reciente sin recrear el EventSource
  const fetchSlotsRef = useRef(fetchSlots);
  useEffect(() => { fetchSlotsRef.current = fetchSlots; }, [fetchSlots]);

  // Escuchar cambios de disponibilidad en tiempo real via SSE
  // Solo depende de slug: la conexión permanece estable sin importar cambios de estado
  useEffect(() => {
    const es = new EventSource(`/api/p/${slug}/stream`);
    es.onmessage = () => fetchSlotsRef.current();
    es.onerror = () => es.close();
    return () => es.close();
  }, [slug]);

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
    setDaySchedule(null);
    setPorTipoBookingError(null);
    setPorTipoDaysOfWeek(null);
  }, []);

  const availableDates = [...new Set(slots.map((s) => s.date))];

  // Para POR_TIPO: generar solo los días del mes visible que tienen horario configurado
  const porTipoAvailableDates = useMemo<string[] | undefined>(() => {
    if (!isPorTipo || !porTipoDaysOfWeek || porTipoDaysOfWeek.length === 0) return undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
      .filter((d) => d >= today && porTipoDaysOfWeek.includes((getDay(d) + 6) % 7))
      .map((d) => format(d, "yyyy-MM-dd"));
  }, [isPorTipo, porTipoDaysOfWeek, viewMonth]);

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

  const clientBookingDates = clientBookings.map((b) => b.date);
  const clientBookingTimesForDate = selectedDate
    ? clientBookings.filter((b) => b.date === selectedDate).map((b) => b.time)
    : [];

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

  const handleAppointmentSelect = useCallback(
    (appointment: Appointment) => {
      // Si el slot pertenece al cliente autenticado, abrir modal de opciones
      const clientBooking = clientBookings.find(
        (b) => b.date === selectedDate && b.time === appointment.time
      );
      if (clientBooking) {
        setClientBookingOptionsTarget(clientBooking);
        return;
      }
      setSelectedAppointment(appointment);
      setBookingError(null);
    },
    [clientBookings, selectedDate]
  );

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
      fetchClientBookings();
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

  async function handlePorTipoConfirm(
    startTime: string,
    _endTime: string,
    serviceTypeId: string,
    paymentMethod: string | null
  ) {
    if (!selectedDate || !selectedEmployeeId) return;
    setPorTipoBookingLoading(true);
    setPorTipoBookingError(null);
    try {
      const res = await fetch(
        `/api/p/${slug}/employees/${selectedEmployeeId}/bookings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            startTime,
            serviceTypeId,
            clientName: clientSession
              ? `${clientSession.nombre} ${clientSession.apellido}`
              : "Cliente",
            clientPhone: "—",
          }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al reservar el turno");
      }
      const data = await res.json();
      const serviceType = daySchedule?.serviceTypes.find((s) => s.id === serviceTypeId);
      setBookingResult({
        businessName,
        date: selectedDate,
        time: startTime,
        price: serviceType?.price ?? 0,
        cbu,
        alias,
        phone,
        clientName: clientSession
          ? `${clientSession.nombre} ${clientSession.apellido}`
          : "Cliente",
        paymentMethod,
      });
      // Refrescar day-schedule para que el nuevo turno aparezca en la columna
      if (selectedDate) {
        fetch(
          `/api/p/${slug}/employees/${selectedEmployeeId}/day-schedule?date=${selectedDate}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((d: DayScheduleData | null) => setDaySchedule(d))
          .catch(() => {});
      }
      void data;
    } catch (err) {
      setPorTipoBookingError(
        err instanceof Error ? err.message : "Error al reservar el turno"
      );
    } finally {
      setPorTipoBookingLoading(false);
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
            availableDates={isPorTipo ? porTipoAvailableDates : availableDates}
            selectedDate={selectedDate}
            viewMonth={viewMonth}
            onMonthChange={handleMonthChange}
            onDaySelect={handleDaySelect}
            clientBookingDates={clientBookingDates}
          />

          {isPorTipo ? (
            /* Flujo POR_TIPO: columna temporal + formulario */
            selectedDate && (
              isLoadingDaySchedule ? (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex items-center justify-center py-10">
                  <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50 dark:opacity-70">Cargando horarios...</p>
                </div>
              ) : daySchedule ? (
                <>
                  <DayScheduleColumn
                    startTime={daySchedule.startTime}
                    endTime={daySchedule.endTime}
                    appointments={daySchedule.appointments}
                  />
                  <DayScheduleBookingForm
                    startTime={daySchedule.startTime}
                    endTime={daySchedule.endTime}
                    serviceTypes={daySchedule.serviceTypes}
                    appointments={daySchedule.appointments}
                    paymentMethods={paymentMethods}
                    onConfirm={handlePorTipoConfirm}
                  />
                  {porTipoBookingError && (
                    <p role="alert" className="font-body text-sm text-red-500 dark:text-red-400 px-1">
                      {porTipoBookingError}
                    </p>
                  )}
                  {porTipoBookingLoading && (
                    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-4 text-center">
                      <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50">Confirmando reserva...</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
                  <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-60">
                    No hay horario de atención configurado para este día.
                  </p>
                </div>
              )
            )
          ) : (
            /* Flujo FIJO: grilla de slots */
            isLoadingSlots ? (
              <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 flex items-center justify-center py-10">
                <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50 dark:opacity-70">Cargando turnos...</p>
              </div>
            ) : (
              <AppointmentSlots
                appointments={appointmentsForDate}
                onSelect={handleAppointmentSelect}
                clientBookingTimes={clientBookingTimesForDate}
              />
            )
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

      {clientBookingOptionsTarget && (
        <ClientBookingOptionsModal
          booking={clientBookingOptionsTarget}
          slug={slug}
          onClose={() => setClientBookingOptionsTarget(null)}
          onCancelSuccess={(bookingId) => {
            setClientBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));
          }}
          onReschedule={(booking) => {
            setClientBookingOptionsTarget(null);
            setClientRescheduleTarget(booking);
          }}
        />
      )}

      {clientRescheduleTarget && (
        <ClientRescheduleModal
          booking={clientRescheduleTarget}
          slug={slug}
          onClose={() => setClientRescheduleTarget(null)}
        />
      )}
    </>
  );
}
