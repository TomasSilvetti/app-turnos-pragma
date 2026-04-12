import { Pencil, Trash2, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TipoDeTurno } from "./TipoDeTurnoForm";

type TiposDeTurnoListProps = {
  tipos: TipoDeTurno[];
  onEdit: (tipo: TipoDeTurno) => void;
  onDelete: (tipo: TipoDeTurno) => void;
  onAdd: () => void;
};

export function TiposDeTurnoList({ tipos, onEdit, onDelete, onAdd }: TiposDeTurnoListProps) {
  if (tipos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] px-6 py-16 text-center">
        <CalendarPlus size={40} className="text-[#E0E0DB]" aria-hidden="true" />
        <div>
          <p className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0]">
            Todavía no creaste ningún tipo de turno
          </p>
          <p className="mt-1 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Agregá tu primer tipo de turno para que tus clientes puedan reservar.
          </p>
        </div>
        <Button
          onClick={onAdd}
          className="bg-[#253551] text-white hover:bg-[#1c2a40]"
        >
          Agregar tipo de turno
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Tabla — desktop */}
      <div className="hidden overflow-hidden rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] sm:block">
        <table className="w-full text-sm" aria-label="Lista de tipos de turno">
          <thead>
            <tr className="bg-[#253551] text-white">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Título
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                Descripción
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Precio
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1e293b]">
            {tipos.map((tipo, index) => (
              <tr
                key={tipo.id}
                className={`border-b border-[#E0E0DB] dark:border-[#2d3548] transition-colors hover:bg-[#eef1f6] dark:hover:bg-[#253551]/10 ${
                  index === tipos.length - 1 ? "border-b-0" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-[#2A2829] dark:text-[#e2e8f0]">{tipo.titulo}</td>
                <td className="px-4 py-3 text-[#2A2829]/70 dark:text-[#94a3b8]">{tipo.descripcion}</td>
                <td className="px-4 py-3 text-right text-[#2A2829] dark:text-[#e2e8f0]">
                  ${tipo.precio.toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(tipo)}
                      aria-label={`Editar ${tipo.titulo}`}
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(tipo)}
                      aria-label={`Eliminar ${tipo.titulo}`}
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
        {tipos.map((tipo) => (
          <div
            key={tipo.id}
            className="rounded-lg border border-[#E0E0DB] dark:border-[#2d3548] bg-white dark:bg-[#1e293b] p-4"
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <span className="font-medium text-[#2A2829] dark:text-[#e2e8f0]">{tipo.titulo}</span>
              <span className="shrink-0 text-sm font-medium text-[#253551]">
                ${tipo.precio.toLocaleString("es-AR")}
              </span>
            </div>
            <p className="mb-3 text-sm text-[#2A2829]/70 dark:text-[#94a3b8]">{tipo.descripcion}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onEdit(tipo)}
                aria-label={`Editar ${tipo.titulo}`}
              >
                <Pencil size={14} aria-hidden="true" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => onDelete(tipo)}
                aria-label={`Eliminar ${tipo.titulo}`}
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
