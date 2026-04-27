import { Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Empleado } from "./types";

type EmpleadoListProps = {
  empleados: Empleado[];
  currentUserId?: string;
  onEdit: (empleado: Empleado) => void;
  onDelete: (empleado: Empleado) => void;
  onAdd: () => void;
};

export function EmpleadoList({ empleados, currentUserId, onEdit, onDelete, onAdd }: EmpleadoListProps) {
  if (empleados.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] px-6 py-16 text-center">
        <Users size={40} className="text-[#E0E0DB]" aria-hidden="true" />
        <div>
          <p className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
            Todavía no hay empleados registrados
          </p>
          <p className="mt-1 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Agregá tu primer empleado para gestionar tu equipo.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="bg-[var(--brand-color)] text-white hover:bg-[#1c2a40]"
        >
          Nuevo empleado
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Tabla — desktop */}
      <div className="hidden overflow-hidden rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] sm:block">
        <table className="w-full text-sm" aria-label="Lista de empleados">
          <thead>
            <tr className="bg-[var(--brand-color)] text-white">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Rol
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Sucursales
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#0c1220]">
            {empleados.map((empleado, index) => (
              <tr
                key={empleado.id}
                className={`border-b border-[#E0E0DB] dark:border-[#1a2840] transition-colors hover:bg-[#eef1f6] dark:hover:bg-[var(--brand-color)]/10 ${
                  index === empleados.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-[#2A2829] dark:text-[#e2e8f0]">{empleado.nombre}</td>
                <td className="px-4 py-3 text-[#2A2829]/70 dark:text-[#94a3b8]">{empleado.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      empleado.rol === "administrador"
                        ? "bg-[var(--brand-color)]/10 text-[var(--brand-color)] dark:bg-[#1e3a5f] dark:text-[#93c5fd]"
                        : "bg-[#F4F5F7] text-[#2A2829]/70 dark:bg-[#0c1220] dark:text-[#94a3b8]"
                    }`}
                  >
                    {empleado.rol === "administrador" ? "Administrador" : "Empleado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#2A2829]/70 dark:text-[#94a3b8]">
                  {empleado.sucursales.length > 0
                    ? empleado.sucursales.map((s) => s.name).join(", ")
                    : <span className="text-[#2A2829]/40 dark:text-[#64748b]">Sin asignar</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(empleado)}
                      aria-label={`Editar ${empleado.nombre}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    {empleado.id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(empleado)}
                        aria-label={`Eliminar ${empleado.nombre}`}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {empleados.map((empleado) => (
          <div
            key={empleado.id}
            className="rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] p-4"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-medium text-[#2A2829] dark:text-[#e2e8f0]">{empleado.nombre}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  empleado.rol === "administrador"
                    ? "bg-[var(--brand-color)]/10 text-[var(--brand-color)] dark:bg-[#1e3a5f] dark:text-[#93c5fd]"
                    : "bg-[#F4F5F7] text-[#2A2829]/70 dark:bg-[#1a2840] dark:text-[#94a3b8]"
                }`}
              >
                {empleado.rol === "administrador" ? "Administrador" : "Empleado"}
              </span>
            </div>
            <p className="text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">{empleado.email}</p>
            <p className="mt-1 mb-3 text-sm text-[#2A2829]/60 dark:text-[#64748b]">
              {empleado.sucursales.length > 0
                ? empleado.sucursales.map((s) => s.name).join(", ")
                : "Sin sucursal asignada"}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(empleado)}
                aria-label={`Editar ${empleado.nombre}`}
              >
                <Pencil size={14} aria-hidden="true" />
                Editar
              </Button>
              {empleado.id !== currentUserId && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => onDelete(empleado)}
                  aria-label={`Eliminar ${empleado.nombre}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
