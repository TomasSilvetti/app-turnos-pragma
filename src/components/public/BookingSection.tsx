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
};

type BookingResult = {
  businessName: string;
  date: string;
  time: string;
  price: number;
};

type Props = {
  slug: string;
  businessName: string;
};

export default function BookingSection({ slug, businessName }: Props) {
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const month = format(viewMonth, "yyyy-MM");
    setIsLoadingSlots(true);
    fetch(`/api/p/${slug}/availability?month=${month}`)
      .then((res) => res.json())
      .then((data: { slots: Slot[] }) => {
        setSlots(data.slots ?? []);
        setSelectedDate((prev) => {
          const monthPrefix = format(viewMonth, "yyyy-MM");
          // Keep selected date if it's still in this month and has slots
          if (prev && prev.startsWith(monthPrefix)) return prev;
          // Otherwise pick the first available date in the month
          const firstAvailable = data.slots?.[0]?.date ?? null;
          return firstAvailable;
        });
      })
      .catch(() => setSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [slug, viewMonth]);

  const availableDates = [...new Set(slots.map((s) => s.date))];

  const appointmentsForDate: Appointment[] = slots
    .filter((s) => s.date === selectedDate && !bookedIds.has(s.id))
    .map((s) => ({ id: s.id, time: s.time, price: s.price }));

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
  }) {
    setIsBooking(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/public/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Error al reservar el turno");
      }

      const appointment = appointmentsForDate.find((a) => a.id === data.appointmentId);
      if (!appointment) throw new Error("Turno no encontrado");

      setBookedIds((prev) => new Set([...prev, data.appointmentId]));
      setSelectedAppointment(null);
      setBookingResult({
        businessName,
        date: selectedDate!,
        time: appointment.time,
        price: appointment.price,
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
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      <MiniCalendar
        availableDates={availableDates}
        selectedDate={selectedDate}
        viewMonth={viewMonth}
        onMonthChange={handleMonthChange}
        onDaySelect={handleDaySelect}
      />

      {isLoadingSlots ? (
        <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 flex items-center justify-center py-10">
          <p className="font-body text-sm text-[#2A2829] opacity-50">Cargando turnos...</p>
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
          isLoading={isBooking}
          error={bookingError}
          onConfirm={handleConfirm}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
