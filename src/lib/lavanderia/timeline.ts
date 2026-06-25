import { horaAMin } from "./fecha";
import type { TurnoAplicable } from "./capacidad";
import type { DiaSnap, OTSnap } from "./tablero";

export type SeccionTurno = {
  turno: TurnoAplicable;
  ots: OTSnap[];
  // Posicion de la linea "ahora" dentro de esta seccion (0..1) o null.
  ahora: number | null;
  // true si el momento actual ya paso este turno por completo.
  pasado: boolean;
};

const NOMBRE_TURNO: Record<string, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  extra: "Turno extra",
};

export function nombreTurno(tipo: string): string {
  return NOMBRE_TURNO[tipo] ?? tipo;
}

// Reparte las OTs (en orden) entre los turnos del dia segun la capacidad de
// cada uno (apilado secuencial). Calcula tambien donde cae la linea "ahora".
export function distribuirEnTurnos(dia: DiaSnap): { secciones: SeccionTurno[]; sinTurnos: OTSnap[] } {
  if (dia.turnos.length === 0) {
    return { secciones: [], sinTurnos: dia.ots };
  }

  const secciones: SeccionTurno[] = dia.turnos.map((turno) => ({
    turno,
    ots: [],
    ahora: null,
    pasado: false,
  }));

  let idx = 0;
  let usadosEnTurno = 0;
  for (const ot of dia.ots) {
    while (idx < secciones.length - 1 && usadosEnTurno >= secciones[idx].turno.minutos) {
      usadosEnTurno -= secciones[idx].turno.minutos;
      idx++;
    }
    secciones[idx].ots.push(ot);
    usadosEnTurno += ot.duracionMin;
  }

  if (dia.ahoraMin !== null) {
    for (const sec of secciones) {
      const ini = horaAMin(sec.turno.horaInicio);
      const fin = horaAMin(sec.turno.horaFin);
      if (dia.ahoraMin >= fin) sec.pasado = true;
      else if (dia.ahoraMin >= ini) sec.ahora = (dia.ahoraMin - ini) / (fin - ini);
    }
  }

  return { secciones, sinTurnos: [] };
}

// Altura proporcional a la duracion, con un piso legible.
export function altoOT(duracionMin: number): number {
  return Math.max(58, Math.round(duracionMin * 0.55));
}

export function formatoDuracion(min: number): string {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function horaActualEtiqueta(ahoraMin: number): string {
  const h = Math.floor(ahoraMin / 60);
  const m = ahoraMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
