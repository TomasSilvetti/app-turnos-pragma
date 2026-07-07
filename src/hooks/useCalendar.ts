"use client";

import { useCallback, useEffect, useState } from "react";
import { notasFetch } from "@/lib/notas/client";
import {
  guardarEventoLocal,
  guardarEventosLocal,
  eliminarEventoLocal,
  listarEventosLocalRango,
} from "@/lib/notas/notasLocal";
import type { CalendarEventValues } from "@/components/notas/CalendarEventModal";

export type CalendarEvent = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  color: string;
  reminderOffsets: number[];
};

// Genera un id local (para eventos creados sin conexión). El servidor lo respeta.
function localId(): string {
  const rnd = Math.floor(Math.random() * 1e9).toString(36);
  return `loc-${Date.now().toString(36)}-${rnd}`;
}

export function useCalendar(deviceReady: boolean, from: string, to: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    if (!deviceReady) return;
    setCargando(true);
    notasFetch(`/api/notas/calendar?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (d: { events?: CalendarEvent[] } | null) => {
        if (d?.events) {
          setEvents(d.events);
          guardarEventosLocal(d.events); // espejo local
        } else {
          // Sin conexión: leer del espejo local para el rango visible.
          setEvents(await listarEventosLocalRango(from, to));
        }
      })
      .catch(async () => {
        setEvents(await listarEventosLocalRango(from, to));
      })
      .finally(() => setCargando(false));
  }, [deviceReady, from, to]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crear = useCallback(async (v: CalendarEventValues) => {
    const id = localId();
    const optimista: CalendarEvent = { id, ...v };
    setEvents((prev) => [...prev, optimista]);
    guardarEventoLocal(optimista);
    const res = await notasFetch("/api/notas/calendar", {
      method: "POST",
      body: JSON.stringify({ id, ...v }),
    }).catch(() => null);
    // 201: el servidor confirmó y devolvió el evento. 202: encolado offline
    // (se mantiene la versión optimista con el mismo id hasta sincronizar).
    if (res?.status === 201) {
      const { event } = await res.json().catch(() => ({ event: null }));
      if (event) {
        setEvents((prev) => prev.map((e) => (e.id === id ? event : e)));
        guardarEventoLocal(event);
      }
    }
  }, []);

  const editar = useCallback(async (id: string, v: CalendarEventValues) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...v } : e)));
    guardarEventoLocal({ id, ...v });
    await notasFetch(`/api/notas/calendar/${id}`, {
      method: "PUT",
      body: JSON.stringify(v),
    }).catch(() => {});
  }, []);

  const eliminar = useCallback(async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    eliminarEventoLocal(id);
    await notasFetch(`/api/notas/calendar/${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  return { events, cargando, crear, editar, eliminar, recargar: cargar };
}
