"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
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

const estadoConfig: Record<EstadoTurno, { label: string; badge: string }> = {
  disponible:        { label: "Disponible",        badge: "text-emerald-600 bg-emerald-50"  },
  no_disponible:     { label: "No disponible",     badge: "text-gray-400 bg-gray-100"       },
  pendiente_de_pago: { label: "Pendiente de pago", badge: "text-amber-600 bg-amber-50"      },
  pagado:            { label: "Pagado",             badge: "text-blue-600 bg-blue-50"        },
  cancelado:         { label: "Cancelado",          badge: "text-red-500 bg-red-50"          },
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
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white shadow-sm px-6 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-1">
          <Clock size={22} className="text-gray-300" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-[#2A2829]">Todavía no configuraste turnos</p>
        <p className="text-xs text-gray-400">
          Completá el formulario de arriba para generar los turnos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {turnos.map((turno) => {
        const estado = resolveEstado(turno);
        const { label, badge } = estadoConfig[estado];

        return (
          <div
            key={turno.id}
            className={`flex flex-col gap-3 rounded-xl border bg-white shadow-sm p-4 transition-all ${
              !turno.activo ? "border-gray-100 opacity-60" : "border-gray-100"
            }`}
          >
            {/* Hora + ícono */}
            <div className="flex items-center gap-2">
              <Clock
                size={14}
                className={turno.activo ? "text-[#253551]" : "text-gray-300"}
              />
              <span
                className={`font-heading text-sm font-semibold ${
                  turno.activo ? "text-[#2A2829]" : "text-gray-400 line-through"
                }`}
              >
                {turno.hora}
              </span>
            </div>

            {/* Estado */}
            <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${badge}`}>
              {label}
            </span>

            {/* Nombre del cliente */}
            {turno.nombreCliente ? (
              <p className="text-xs font-medium text-[#2A2829] truncate">{turno.nombreCliente}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">Sin reserva</p>
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
                  className="h-7 flex-1 px-2 text-xs border-gray-200 text-[#2A2829] hover:bg-[#eef1f6] hover:border-[#253551]"
                >
                  {turno.activo ? "Desactivar" : "Activar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteClick(turno.id)}
                  aria-label={`Eliminar turno de las ${turno.hora}`}
                  className="h-7 flex-1 px-2 text-xs border-gray-200 text-red-500 hover:border-red-300 hover:bg-red-50"
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
