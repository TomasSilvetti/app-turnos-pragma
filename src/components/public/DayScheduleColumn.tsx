"use client";

export type ScheduledAppointment = {
  time: string; // "HH:mm" — horario de inicio
  duracion: number; // duración en minutos
};

export type PreviewAppointment = {
  time: string; // "HH:mm"
  duracion: number; // duración en minutos
};

export type ClientOwnAppointment = {
  time: string; // "HH:mm"
  duracion: number; // minutos
  onClick: () => void;
};

type Props = {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  appointments: ScheduledAppointment[];
  previewAppointment?: PreviewAppointment | null;
  clientAppointment?: ClientOwnAppointment | null;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function DayScheduleColumn({
  startTime,
  endTime,
  appointments,
  previewAppointment,
  clientAppointment,
}: Props) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const totalMin = endMin - startMin;

  // Generar filas horarias (una por hora)
  const hourRows: number[] = [];
  for (
    let min = startMin;
    min <= endMin;
    min += 60
  ) {
    hourRows.push(min);
  }

  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
      <h2 className="font-heading text-xs text-gray-400 dark:text-[#64748b] mb-4 uppercase tracking-widest">
        Turnos del día
      </h2>

      {/* Columna temporal */}
      <div className="relative w-full" style={{ height: `${totalMin * 1.2}px` }}>
        {/* Filas horarias */}
        {hourRows.map((min) => {
          const offsetPct = ((min - startMin) / totalMin) * 100;
          const isStart = min === startMin;
          const isEnd = min === endMin;
          return (
            <div
              key={min}
              className="absolute left-0 right-0 flex items-center gap-2"
              style={{ top: `${offsetPct}%` }}
            >
              <span className="font-small text-[11px] text-gray-400 dark:text-[#475569] w-10 shrink-0 text-right select-none">
                {minutesToLabel(min)}
              </span>
              <div
                className={`flex-1 border-t ${
                  isStart || isEnd
                    ? "border-gray-300 dark:border-[#334155]"
                    : "border-dashed border-gray-200 dark:border-[#2d3548]"
                }`}
              />
            </div>
          );
        })}

        {/* Bloque preview: turno que se está por sacar */}
        {previewAppointment && (() => {
          const prevStartMin = timeToMinutes(previewAppointment.time);
          const prevEndMin = prevStartMin + previewAppointment.duracion;
          const topPct = ((prevStartMin - startMin) / totalMin) * 100;
          const heightPct = (previewAppointment.duracion / totalMin) * 100;
          const endLabel = minutesToLabel(prevEndMin);
          return (
            <div
              className="absolute left-12 right-0 rounded-md flex flex-col justify-center px-3 py-1 overflow-hidden"
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                backgroundColor: "color-mix(in srgb, #22c55e 18%, transparent)",
                borderLeft: "3px solid #22c55e",
              }}
              role="img"
              aria-label={`Tu turno de ${previewAppointment.time} a ${endLabel}`}
            >
              <span className="font-small text-[11px] font-semibold leading-tight text-emerald-600 dark:text-emerald-400 truncate">
                {previewAppointment.time} – {endLabel}
              </span>
              <span className="font-small text-[10px] font-medium leading-tight text-emerald-600 dark:text-emerald-400 opacity-70 truncate uppercase tracking-wide">
                Tu turno
              </span>
            </div>
          );
        })()}

        {/* Bloques de turnos reservados */}
        {appointments.map((appt, idx) => {
          // Si este bloque pertenece al cliente, se renderiza aparte abajo
          if (clientAppointment && appt.time === clientAppointment.time) return null;

          const apptStartMin = timeToMinutes(appt.time);
          const apptEndMin = apptStartMin + appt.duracion;
          const topPct = ((apptStartMin - startMin) / totalMin) * 100;
          const heightPct = (appt.duracion / totalMin) * 100;
          const endLabel = minutesToLabel(apptEndMin);

          return (
            <div
              key={idx}
              className="absolute left-12 right-0 rounded-md flex flex-col justify-center px-3 py-1 overflow-hidden"
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                backgroundColor: "color-mix(in srgb, var(--brand-color) 20%, transparent)",
                borderLeft: "3px solid var(--brand-color)",
              }}
              role="img"
              aria-label={`Turno reservado de ${appt.time} a ${endLabel}`}
            >
              <span className="font-small text-[11px] font-semibold leading-tight text-[var(--brand-color)] dark:text-[#93c5fd] truncate">
                {appt.time} – {endLabel}
              </span>
              <span className="font-small text-[10px] font-medium leading-tight text-[var(--brand-color)] dark:text-[#93c5fd] opacity-70 truncate uppercase tracking-wide">
                Ocupado
              </span>
            </div>
          );
        })}

        {/* Bloque del turno propio del cliente (clickeable) */}
        {clientAppointment && (() => {
          const clientStartMin = timeToMinutes(clientAppointment.time);
          const clientEndMin = clientStartMin + clientAppointment.duracion;
          const topPct = ((clientStartMin - startMin) / totalMin) * 100;
          const heightPct = (clientAppointment.duracion / totalMin) * 100;
          const endLabel = minutesToLabel(clientEndMin);
          return (
            <button
              type="button"
              onClick={clientAppointment.onClick}
              className="absolute left-12 right-0 rounded-md flex flex-col justify-center px-3 py-1 overflow-hidden cursor-pointer hover:brightness-95 transition-all"
              style={{
                top: `${topPct}%`,
                height: `${heightPct}%`,
                backgroundColor: "color-mix(in srgb, #22c55e 18%, transparent)",
                borderLeft: "3px solid #22c55e",
              }}
              aria-label={`Tu turno de ${clientAppointment.time} a ${endLabel}. Clic para opciones.`}
            >
              <span className="font-small text-[11px] font-semibold leading-tight text-emerald-600 dark:text-emerald-400 truncate">
                {clientAppointment.time} – {endLabel}
              </span>
              <span className="font-small text-[10px] font-medium leading-tight text-emerald-600 dark:text-emerald-400 opacity-70 truncate uppercase tracking-wide">
                Tu turno
              </span>
            </button>
          );
        })()}
      </div>

      {appointments.length === 0 && (
        <p className="font-body text-sm text-gray-400 dark:text-[#64748b] text-center mt-2">
          Sin turnos reservados en este día
        </p>
      )}
    </div>
  );
}
