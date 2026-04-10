"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import MiniCalendar from "./MiniCalendar";
import AppointmentSlots, { type Appointment } from "./AppointmentSlots";
import BookingModal from "./BookingModal";
import BookingConfirmation from "./BookingConfirmation";

// Datos mock — se reemplazarán al conectar con el backend (porcion-004, 006, 008)
const MOCK_AVAILABLE_DATES = (() => {
  const today = new Date();
  const dates: string[] = [];
  for (let i = 0; i < 20; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i * 2);
    dates.push(format(d, "yyyy-MM-dd"));
  }
  return dates;
})();

const MOCK_APPOINTMENTS: Record<string, Appointment[]> = {
  default: [
    { id: "1", time: "09:00", price: 2500 },
    { id: "2", time: "10:00", price: 2500 },
    { id: "3", time: "11:00", price: 2500 },
    { id: "4", time: "14:00", price: 3000 },
    { id: "5", time: "15:00", price: 3000 },
    { id: "6", time: "16:00", price: 3000 },
  ],
};

type BookingResult = {
  businessName: string;
  date: string;
  time: string;
  price: number;
};

type Props = {
  businessName: string;
};

export default function BookingSection({ businessName }: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [selectedDate, setSelectedDate] = useState<string>(
    MOCK_AVAILABLE_DATES.includes(todayStr) ? todayStr : MOCK_AVAILABLE_DATES[0]
  );
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());

  const availableAppointments = (
    MOCK_APPOINTMENTS[selectedDate] ?? MOCK_APPOINTMENTS["default"]
  ).filter((a) => !bookedIds.has(a.id));

  const handleDaySelect = useCallback((date: string) => {
    setSelectedDate(date);
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
    setIsLoading(true);
    setBookingError(null);

    try {
      // TODO: reemplazar con llamada real al endpoint POST /api/public/bookings (porcion-008)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const appointment = availableAppointments.find(
        (a) => a.id === data.appointmentId
      );
      if (!appointment) throw new Error("Turno no encontrado");

      setBookedIds((prev) => new Set([...prev, data.appointmentId]));
      setSelectedAppointment(null);
      setBookingResult({
        businessName,
        date: selectedDate,
        time: appointment.time,
        price: appointment.price,
      });
    } catch {
      setBookingError("El turno ya no está disponible. Por favor elegí otro.");
    } finally {
      setIsLoading(false);
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
        availableDates={MOCK_AVAILABLE_DATES}
        selectedDate={selectedDate}
        onDaySelect={handleDaySelect}
      />

      <AppointmentSlots
        appointments={availableAppointments}
        onSelect={handleAppointmentSelect}
      />

      {selectedAppointment && (
        <BookingModal
          appointment={selectedAppointment}
          isLoading={isLoading}
          error={bookingError}
          onConfirm={handleConfirm}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
