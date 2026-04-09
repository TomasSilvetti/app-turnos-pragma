"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type Turno = {
  id: string;
  hora: string;
  precio: number;
  activo: boolean;
};

type TurnosGeneradosListProps = {
  turnos: Turno[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

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
    <div className="overflow-x-auto rounded-lg border border-[#E0E0DB]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#253551] text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Hora
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Precio
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
              Estado
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E0E0DB] bg-white">
          {turnos.map((turno) => (
            <tr
              key={turno.id}
              className="transition-colors hover:bg-[#eef1f6]"
            >
              {/* Hora */}
              <td className="px-4 py-3">
                <span
                  className={
                    turno.activo
                      ? "font-medium text-[#2A2829]"
                      : "font-medium text-slate-400 line-through"
                  }
                >
                  {turno.hora}
                </span>
              </td>

              {/* Precio */}
              <td className="px-4 py-3">
                <span className={turno.activo ? "text-[#2A2829]" : "text-slate-400"}>
                  ${turno.precio.toLocaleString("es-AR")}
                </span>
              </td>

              {/* Estado */}
              <td className="px-4 py-3">
                {turno.activo ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E0E0DB] px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                    Inactivo
                  </span>
                )}
              </td>

              {/* Acciones */}
              <td className="px-4 py-3">
                {confirmingId === turno.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <span className="hidden text-xs text-slate-500 sm:inline">¿Eliminar?</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleConfirmDelete(turno.id)}
                      className="h-7 px-2.5 text-xs"
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelDelete}
                      className="h-7 px-2.5 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onToggle(turno.id)}
                      className="h-7 px-2.5 text-xs border-[#E0E0DB] text-[#2A2829] hover:bg-[#eef1f6]"
                    >
                      {turno.activo ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClick(turno.id)}
                      aria-label={`Eliminar turno de las ${turno.hora}`}
                      className="h-7 px-2.5 text-xs border-[#E0E0DB] text-red-500 hover:border-red-300 hover:bg-red-50"
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
