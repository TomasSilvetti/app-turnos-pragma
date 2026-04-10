"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// --- Tipos ---
interface TipoDeTurno {
  id: string;
  titulo: string;
}

interface ConfiguracionTurnos {
  horaApertura: string;
  horaCierre: string;
  intervalo: number;
  dias: string[];
  tiposSeleccionados: string[];
}

// --- Mock data ---
const mockTipos: TipoDeTurno[] = [
  { id: "1", titulo: "Consulta general" },
  { id: "2", titulo: "Control de seguimiento" },
  { id: "3", titulo: "Primera vez" },
];

const mockConfigExistente: ConfiguracionTurnos | null = {
  horaApertura: "09:00",
  horaCierre: "18:00",
  intervalo: 30,
  dias: ["L", "M", "X", "J", "V"],
  tiposSeleccionados: ["1", "2"],
};

const mockConflictCount = 3;

const DIAS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const INTERVALOS = [15, 30, 45, 60] as const;
const DIAS_DEFAULT = ["L", "M", "X", "J", "V"];

// --- Componente modal ---
interface ModalAdvertenciaProps {
  conflictCount: number;
  onConfirmar: () => void;
  onCancelar: () => void;
}

function ModalAdvertencia({ conflictCount, onConfirmar, onCancelar }: ModalAdvertenciaProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-titulo"
    >
      <div className="w-full max-w-md rounded-lg border border-[#E0E0DB] bg-white p-6 shadow-lg">
        <h2 id="modal-titulo" className="font-heading text-lg text-[#253551]">
          Actualizar configuración
        </h2>

        <p className="mt-3 text-sm text-[#2A2829]">
          Estás por actualizar tu configuración. Los turnos ya generados serán reemplazados por los
          nuevos parámetros. ¿Querés continuar?
        </p>

        {conflictCount > 0 && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>{conflictCount} reservas activas</strong> quedarán sin turno asignado con la
            nueva configuración. Podés continuar y gestionar las reprogramaciones después, o cancelar
            para revisar.
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button className="bg-[#253551] text-white hover:bg-[#1c2a40]" onClick={onConfirmar}>
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Página principal ---
export default function ConfiguracionTurnosPage() {
  const configInicial = mockConfigExistente;

  const [horaApertura, setHoraApertura] = useState(configInicial?.horaApertura ?? "");
  const [horaCierre, setHoraCierre] = useState(configInicial?.horaCierre ?? "");
  const [intervalo, setIntervalo] = useState<number>(configInicial?.intervalo ?? 30);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>(
    configInicial?.dias ?? DIAS_DEFAULT
  );
  const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>(
    configInicial?.tiposSeleccionados ?? []
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [modalVisible, setModalVisible] = useState(false);

  // --- Validación ---
  const horaCierreInvalida =
    horaApertura !== "" && horaCierre !== "" && horaCierre <= horaApertura;
  const guardarDeshabilitado =
    horaCierreInvalida ||
    diasSeleccionados.length === 0 ||
    tiposSeleccionados.length === 0 ||
    horaApertura === "" ||
    horaCierre === "";

  function toggleDia(dia: string) {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  }

  function toggleTipo(id: string) {
    setTiposSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function validar(): boolean {
    const nuevosErrores: Record<string, string> = {};
    if (!horaApertura) nuevosErrores.horaApertura = "Ingresá la hora de apertura.";
    if (!horaCierre) nuevosErrores.horaCierre = "Ingresá la hora de cierre.";
    if (horaCierreInvalida) nuevosErrores.horaCierre = "La hora de cierre debe ser posterior a la de apertura.";
    if (diasSeleccionados.length === 0) nuevosErrores.dias = "Seleccioná al menos un día.";
    if (tiposSeleccionados.length === 0) nuevosErrores.tipos = "Seleccioná al menos un tipo de turno.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  function handleGuardar() {
    if (!validar()) return;
    if (configInicial) {
      setModalVisible(true);
    } else {
      guardar();
    }
  }

  function guardar() {
    // Aquí se conectará con el endpoint en la porción Back par (porcion-003)
    console.log("Guardando configuración", {
      horaApertura,
      horaCierre,
      intervalo,
      diasSeleccionados,
      tiposSeleccionados,
    });
    setModalVisible(false);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[#253551]">Configuración de turnos</h1>
        <p className="mt-0.5 text-sm text-[#2A2829]/60">
          Definí tu disponibilidad semanal para la generación de turnos.
        </p>
      </div>

      <div className="rounded-lg border border-[#E0E0DB] bg-white p-5 space-y-6">

        {/* Horario */}
        <section aria-labelledby="seccion-horario">
          <h2 id="seccion-horario" className="font-heading text-base text-[#253551] mb-3">
            Horario de atención
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hora-apertura" className="block text-sm font-medium text-[#2A2829] mb-1">
                Hora de apertura
              </label>
              <input
                id="hora-apertura"
                type="time"
                value={horaApertura}
                onChange={(e) => {
                  setHoraApertura(e.target.value);
                  setErrores((prev) => ({ ...prev, horaApertura: "" }));
                }}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm text-[#2A2829] outline-none transition-colors focus:ring-2 focus:ring-[#253551]/30",
                  errores.horaApertura ? "border-[#ef4444]" : "border-[#E0E0DB]"
                )}
              />
              {errores.horaApertura && (
                <p className="mt-1 text-xs text-[#ef4444]">{errores.horaApertura}</p>
              )}
            </div>
            <div>
              <label htmlFor="hora-cierre" className="block text-sm font-medium text-[#2A2829] mb-1">
                Hora de cierre
              </label>
              <input
                id="hora-cierre"
                type="time"
                value={horaCierre}
                onChange={(e) => {
                  setHoraCierre(e.target.value);
                  setErrores((prev) => ({ ...prev, horaCierre: "" }));
                }}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-sm text-[#2A2829] outline-none transition-colors focus:ring-2 focus:ring-[#253551]/30",
                  errores.horaCierre ? "border-[#ef4444]" : "border-[#E0E0DB]"
                )}
              />
              {errores.horaCierre && (
                <p className="mt-1 text-xs text-[#ef4444]">{errores.horaCierre}</p>
              )}
            </div>
          </div>
        </section>

        {/* Intervalo */}
        <section aria-labelledby="seccion-intervalo">
          <h2 id="seccion-intervalo" className="font-heading text-base text-[#253551] mb-3">
            Intervalo entre turnos
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Seleccioná el intervalo en minutos">
            {INTERVALOS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setIntervalo(min)}
                aria-pressed={intervalo === min}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  intervalo === min
                    ? "border-[#253551] bg-[#253551] text-white"
                    : "border-[#E0E0DB] bg-white text-[#2A2829] hover:bg-[#F4F5F7]"
                )}
              >
                {min} min
              </button>
            ))}
          </div>
        </section>

        {/* Días */}
        <section aria-labelledby="seccion-dias">
          <h2 id="seccion-dias" className="font-heading text-base text-[#253551] mb-3">
            Días habilitados
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Seleccioná los días de atención">
            {DIAS.map((dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => {
                  toggleDia(dia);
                  setErrores((prev) => ({ ...prev, dias: "" }));
                }}
                aria-pressed={diasSeleccionados.includes(dia)}
                className={cn(
                  "h-10 w-10 rounded-md border text-sm font-medium transition-colors",
                  diasSeleccionados.includes(dia)
                    ? "border-[#253551] bg-[#253551] text-white"
                    : "border-[#E0E0DB] bg-white text-[#2A2829] hover:bg-[#F4F5F7]"
                )}
              >
                {dia}
              </button>
            ))}
          </div>
          {errores.dias && (
            <p className="mt-1 text-xs text-[#ef4444]">{errores.dias}</p>
          )}
        </section>

        {/* Tipos de turno */}
        <section aria-labelledby="seccion-tipos">
          <h2 id="seccion-tipos" className="font-heading text-base text-[#253551] mb-3">
            Tipos de turno
          </h2>
          <div className="space-y-2">
            {mockTipos.map((tipo) => (
              <label
                key={tipo.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-[#E0E0DB] px-4 py-3 text-sm text-[#2A2829] transition-colors hover:bg-[#F4F5F7]"
              >
                <input
                  type="checkbox"
                  checked={tiposSeleccionados.includes(tipo.id)}
                  onChange={() => {
                    toggleTipo(tipo.id);
                    setErrores((prev) => ({ ...prev, tipos: "" }));
                  }}
                  className="h-4 w-4 rounded border-[#E0E0DB] accent-[#253551]"
                  aria-label={tipo.titulo}
                />
                {tipo.titulo}
              </label>
            ))}
          </div>
          {errores.tipos && (
            <p className="mt-1 text-xs text-[#ef4444]">{errores.tipos}</p>
          )}
        </section>

        {/* Botón guardar */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleGuardar}
            disabled={guardarDeshabilitado}
            className="bg-[#253551] text-white hover:bg-[#1c2a40] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar configuración
          </Button>
        </div>
      </div>

      {/* Modal */}
      {modalVisible && (
        <ModalAdvertencia
          conflictCount={mockConflictCount}
          onConfirmar={guardar}
          onCancelar={() => setModalVisible(false)}
        />
      )}
    </div>
  );
}
