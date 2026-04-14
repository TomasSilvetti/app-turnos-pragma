import { Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Sucursal } from "./types";

type SucursalListProps = {
  sucursales: Sucursal[];
  onEdit: (sucursal: Sucursal) => void;
  onDelete: (sucursal: Sucursal) => void;
  onAdd: () => void;
};

export function SucursalList({ sucursales, onEdit, onDelete, onAdd }: SucursalListProps) {
  if (sucursales.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] px-6 py-16 text-center">
        <Building2 size={40} className="text-[#E0E0DB]" aria-hidden="true" />
        <div>
          <p className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
            Todavía no hay sucursales registradas
          </p>
          <p className="mt-1 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Agregá tu primera sucursal para organizar tu negocio por ubicaciones.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="bg-[var(--brand-color)] text-white hover:bg-[#1c2a40]"
        >
          Nueva sucursal
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Tabla — desktop */}
      <div className="hidden overflow-hidden rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] sm:block">
        <table className="w-full text-sm" aria-label="Lista de sucursales">
          <thead>
            <tr className="bg-[var(--brand-color)] text-white">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Dirección
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1e293b]">
            {sucursales.map((sucursal, index) => (
              <tr
                key={sucursal.id}
                className={`border-b border-[#E0E0DB] dark:border-[#2d3548] transition-colors hover:bg-[#eef1f6] dark:hover:bg-[var(--brand-color)]/10 ${
                  index === sucursales.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-[#2A2829] dark:text-[#e2e8f0]">{sucursal.name}</td>
                <td className="px-4 py-3 text-[#2A2829]/70 dark:text-[#94a3b8]">{sucursal.address}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(sucursal)}
                      aria-label={`Editar ${sucursal.name}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(sucursal)}
                      aria-label={`Eliminar ${sucursal.name}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {sucursales.map((sucursal) => (
          <div
            key={sucursal.id}
            className="rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] p-4"
          >
            <div className="mb-1">
              <span className="font-medium text-[#2A2829] dark:text-[#e2e8f0]">{sucursal.name}</span>
            </div>
            <p className="mb-3 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">{sucursal.address}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(sucursal)}
                aria-label={`Editar ${sucursal.name}`}
              >
                <Pencil size={14} aria-hidden="true" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => onDelete(sucursal)}
                aria-label={`Eliminar ${sucursal.name}`}
              >
                <Trash2 size={14} aria-hidden="true" />
                Eliminar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
