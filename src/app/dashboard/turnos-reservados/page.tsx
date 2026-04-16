import { Suspense } from "react";
import BookingList from "@/components/panel/BookingList";

export default function TurnosReservadosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Turnos reservados</h1>
      <Suspense>
        <BookingList />
      </Suspense>
    </div>
  );
}
