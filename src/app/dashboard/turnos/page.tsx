"use client";

import { useEffect, useState } from "react";
import { TurnosConfigForm, type TurnosConfigFormValues } from "@/components/turnos/TurnosConfigForm";
import { TurnosGeneradosList, type Turno } from "@/components/turnos/TurnosGeneradosList";

type ScheduleConfig = {
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  price: number;
};

type AppointmentFromApi = {
  id: string;
  time: string;
  isActive: boolean;
};

function mapAppointment(a: AppointmentFromApi, price: number): Turno {
  return {
    id: a.id,
    hora: a.time,
    precio: price,
    activo: a.isActive,
  };
}

export default function DashboardTurnosPage() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [initialValues, setInitialValues] = useState<Partial<TurnosConfigFormValues> | undefined>(undefined);
  const [precio, setPrecio] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/schedule-config")
      .then((r) => r.json())
      .then((data: { config: ScheduleConfig | null; appointments: AppointmentFromApi[] }) => {
        if (data.config) {
          const p = Number(data.config.price);
          setPrecio(p);
          setInitialValues({
            horaInicio: data.config.startTime,
            horaFin: data.config.endTime,
            intervalo: data.config.intervalMinutes,
            precio: p,
          });
          setTurnos(data.appointments.map((a) => mapAppointment(a, p)));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(data: TurnosConfigFormValues): Promise<{ error?: string } | void> {
    const res = await fetch("/api/schedule-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: data.horaInicio,
        endTime: data.horaFin,
        intervalMinutes: Number(data.intervalo),
        price: Number(data.precio),
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { error: json.error ?? "Error al guardar la configuración" };
    }

    const p = Number(data.precio);
    setPrecio(p);
    setTurnos((json.appointments as AppointmentFromApi[]).map((a) => mapAppointment(a, p)));
  }

  async function handleToggle(id: string) {
    const res = await fetch(`/api/appointments/${id}`, { method: "PATCH" });
    if (!res.ok) return;
    const updated: AppointmentFromApi = await res.json();
    setTurnos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activo: updated.isActive } : t))
    );
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setTurnos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-[#2A2829]">Configuración de turnos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Definí el horario de atención, el intervalo entre turnos y el precio por turno.
        </p>
      </div>

      <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 sm:p-8">
        {!loading && (
          <TurnosConfigForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-heading text-lg text-[#2A2829]">Turnos generados</h2>
        <TurnosGeneradosList
          turnos={turnos}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
