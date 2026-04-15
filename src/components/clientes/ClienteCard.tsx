"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export type ClienteResumen = {
  id: string;
  nombre: string;
  apellido: string;
  ingresoTotal: number;
};

type Visita = {
  fecha: string;
  tipoTurno: string;
  monto: number;
  empleado?: string;
  paymentMethod?: string | null;
};

type HistorialData = {
  frecuenciaPromedio: number | null;
  visitas: Visita[];
};

function formatARS(value: number): string {
  return "$" + value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatFecha(fecha: string): string {
  try {
    return format(parseISO(fecha), "dd/MM/yyyy", { locale: es });
  } catch {
    return fecha;
  }
}

export function ClienteCard({ cliente }: { cliente: ClienteResumen }) {
  const [expanded, setExpanded] = useState(false);
  const [historial, setHistorial] = useState<HistorialData | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState(false);

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (historial) return;
    setLoadingHistorial(true);
    setErrorHistorial(false);
    try {
      const res = await fetch(`/api/clientes/${cliente.id}/historial`);
      if (!res.ok) throw new Error();
      const data: HistorialData = await res.json();
      setHistorial(data);
    } catch {
      setErrorHistorial(true);
    } finally {
      setLoadingHistorial(false);
    }
  }

  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] overflow-hidden transition-shadow hover:shadow-sm">
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer"
        aria-expanded={expanded}
        aria-controls={`historial-${cliente.id}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-color)]/10 text-[var(--brand-color)] flex items-center justify-center font-small text-[11px] font-bold shrink-0">
            {cliente.nombre[0]}{cliente.apellido[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-[#2A2829] dark:text-[#e2e8f0]">
              {cliente.nombre} {cliente.apellido}
            </p>
            <p className="font-small text-[11px] text-[#6b7280] dark:text-[#94a3b8]">
              {formatARS(cliente.ingresoTotal)} en total
            </p>
          </div>
        </div>
        <span
          className={`material-symbols-outlined text-[#6b7280] dark:text-[#94a3b8] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          style={{ fontSize: "18px" }}
          aria-hidden="true"
          translate="no"
        >
          expand_more
        </span>
      </button>

      {expanded && (
        <div
          id={`historial-${cliente.id}`}
          className="border-t border-[#E0E0DB] dark:border-[#2d3548] px-5 py-4"
        >
          {loadingHistorial && (
            <div className="flex items-center gap-2 text-sm text-[#6b7280] dark:text-[#94a3b8] animate-pulse">
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }} translate="no">
                hourglass_empty
              </span>
              Cargando historial...
            </div>
          )}

          {errorHistorial && !loadingHistorial && (
            <p className="text-sm text-[#ef4444]">
              No se pudo cargar el historial. Intentá de nuevo.
            </p>
          )}

          {historial && !loadingHistorial && (
            <>
              <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8] mb-3">
                Frecuencia promedio:{" "}
                <span className="normal-case font-medium text-[#2A2829] dark:text-[#e2e8f0]">
                  {historial.frecuenciaPromedio && historial.frecuenciaPromedio > 0
                    ? `${historial.frecuenciaPromedio} días`
                    : "Primera visita"}
                </span>
              </p>

              <div className="flex flex-col gap-2">
                {historial.visitas.map((visita, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-[#F4F5F7] dark:border-[#2d3548] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-small text-[11px] text-[#6b7280] dark:text-[#94a3b8] w-20 shrink-0">
                        {formatFecha(visita.fecha)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm text-[#2A2829] dark:text-[#e2e8f0]">
                          {visita.tipoTurno}
                        </span>
                        <span className="font-small text-[11px] text-[#6b7280] dark:text-[#94a3b8]">
                          {visita.empleado}
                          {visita.paymentMethod && (
                            <> · {visita.paymentMethod === "cash" ? "Efectivo" : "Transferencia"}</>
                          )}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-[var(--brand-color)]">
                      {formatARS(visita.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
