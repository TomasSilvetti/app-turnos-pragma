"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import RescheduleModal from "./RescheduleModal";

export type RescheduleItem = {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  appointmentType: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string;
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

export default function RescheduleList() {
  const [items, setItems] = useState<RescheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RescheduleItem | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/panel/reschedules");
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

  function handleRescheduled(bookingId: string) {
    setSelectedItem(null);
    setItems((prev) => prev.filter((i) => i.bookingId !== bookingId));
  }

  return (
    <>
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] overflow-hidden">
        {/* Header de tabla — solo en sm+ */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_auto] bg-[#253551] text-white text-xs uppercase tracking-[0.05em] font-body px-4 py-2.5">
          <span>Cliente</span>
          <span>Turno original</span>
          <span className="w-28" />
        </div>

        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center px-4">
            <CalendarClock size={36} className="text-[#E0E0DB]" aria-hidden="true" />
            <p className="font-body text-sm text-[#2A2829] dark:text-[#94a3b8] opacity-50">
              No hay reprogramaciones pendientes.
            </p>
          </div>
        ) : (
          items.map((item) => {
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
                {/* Cliente */}
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] font-medium truncate">
                    {item.clientName}
                  </span>
                  <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100">
                    {item.clientPhone}
                  </span>
                </div>

                {/* Turno original */}
                <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                  <span className="font-body text-sm text-[#2A2829] dark:text-[#e2e8f0] truncate">
                    {item.appointmentType}
                  </span>
                  <span className="font-small text-xs text-[#2A2829] dark:text-[#94a3b8] opacity-60 dark:opacity-100 capitalize">
                    {formattedDate}, {item.appointmentTime} hs
                  </span>
                </div>

                {/* Acción */}
                <button
                  onClick={() => setSelectedItem(item)}
                  className="shrink-0 font-body text-sm text-white bg-[#253551] rounded-md px-4 py-2 hover:bg-[#1c2a40] transition-colors w-full sm:w-auto"
                >
                  Reprogramar
                </button>
              </div>
            );
          })
        )}
      </div>

      {selectedItem && (
        <RescheduleModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onRescheduled={handleRescheduled}
        />
      )}
    </>
  );
}
