"use client";

import { useState } from "react";
import { TurnosConfigForm } from "@/components/turnos/TurnosConfigForm";
import { TurnosGeneradosList, type Turno } from "@/components/turnos/TurnosGeneradosList";

const TURNOS_MOCK: Turno[] = [
  { id: "1", hora: "08:00", precio: 2000, activo: true },
  { id: "2", hora: "08:30", precio: 2000, activo: true },
  { id: "3", hora: "09:00", precio: 2000, activo: false },
  { id: "4", hora: "09:30", precio: 2000, activo: true },
];

export default function DashboardTurnosPage() {
  const [turnos, setTurnos] = useState<Turno[]>(TURNOS_MOCK);

  function handleToggle(id: string) {
    setTurnos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, activo: !t.activo } : t))
    );
  }

  function handleDelete(id: string) {
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
        <TurnosConfigForm
          onSubmit={async (data) => {
            console.log("Configuración guardada:", data);
          }}
        />
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
