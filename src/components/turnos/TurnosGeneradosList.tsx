"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type EstadoTurno = "disponible" | "no_disponible" | "pendiente_de_pago" | "pagado" | "cancelado";

export type Turno = {
  id: string;
  hora: string;
  precio: number;
  activo: boolean;
  estado?: EstadoTurno;
  nombreCliente?: string;
};

type TurnosGeneradosListProps = {
  turnos: Turno[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

const estadoConfig: Record<EstadoTurno, { label: string; dot: string; badge: string }> = {
  disponible:        { label: "Disponible",         dot: "bg-green-500",  badge: "bg-green-100 text-green-700" },
  no_disponible:     { label: "No disponible",      dot: "bg-slate-400",  badge: "bg-slate-100 text-slate-500" },
  pendiente_de_pago: { label: "Pendiente de pago",  dot: "bg-amber-400",  badge: "bg-amber-100 text-amber-700" },
  pagado:            { label: "Pagado",              dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700"   },
  cancelado:         { label: "Cancelado",           dot: "bg-red-400",    badge: "bg-red-100 text-red-600"     },
};

function resolveEstado(turno: Turno): EstadoTurno {
  if (turno.estado) return turno.estado;
  return turno.activo ? "disponible" : "no_disponible";
}

export function TurnosGeneradosList({ turnos, onToggle, onDelete }: TurnosGeneradosListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleDeleteClick(id: string) {
    setConfirmingId(id);
  }

  function handleConfirmDelete(id: string) {
    onDelete(id);
    setConfirmingId(null);
  }

  function handleCancelDelete() {
    setConfirmingId(null);
  }

  if (turnos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[#E0E0DB] bg-white px-6 py-10 text-center">
        <span className="material-symbols-outlined text-4xl text-[#E0E0DB]">calendar_today</span>
        <p className="text-sm font-medium text-[#2A2829]">Todavía no configuraste turnos</p>
        <p className="text-xs text-slate-400">
          Completá el formulario de arriba para generar los turnos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {turnos.map((turno) => {
        const estado = resolveEstado(turno);
        const { label, dot, badge } = estadoConfig[estado];

        return (
          <div
            key={turno.id}
            className={`flex flex-col gap-3 rounded-lg border bg-white p-4 transition-colors ${
              !turno.activo ? "border-[#E0E0DB] opacity-70" : "border-[#E0E0DB]"
            }`}
          >
            {/* Hora */}
            <span
              className={`text-xl font-bold ${
                turno.activo ? "text-[#2A2829]" : "text-slate-400 line-through"
              }`}
            >
              {turno.hora}
            </span>

            {/* Estado */}
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
              {label}
            </span>

            {/* Nombre del cliente */}
            {turno.nombreCliente ? (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-[#2A2829]">{turno.nombreCliente}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">Sin reserva</p>
            )}

            {/* Acciones */}
            {confirmingId === turno.id ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleConfirmDelete(turno.id)}
                  className="h-7 flex-1 px-2 text-xs"
                >
                  Confirmar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelDelete}
                  className="h-7 flex-1 px-2 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onToggle(turno.id)}
                  className="h-7 flex-1 px-2 text-xs border-[#E0E0DB] text-[#2A2829] hover:bg-[#eef1f6]"
                >
                  {turno.activo ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClick(turno.id)}
                  aria-label={`Eliminar turno de las ${turno.hora}`}
                  className="h-7 flex-1 px-2 text-xs border-[#E0E0DB] text-red-500 hover:border-red-300 hover:bg-red-50"
                >
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
