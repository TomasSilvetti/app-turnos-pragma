import { horaAMin } from "./fecha";
import type { DiaSnap } from "./tablero";

// Etiqueta de los horarios del día ("08–14 · 17–21"). Vacía si no hay turnos.
export function etiquetaTurnos(dia: DiaSnap): string {
  return dia.turnos.map((t) => `${t.horaInicio}–${t.horaFin}`).join(" · ");
}

// Índice de la lista de OTs del día donde va la línea "ahora" (o null si no
// corresponde). El día se ve como una sola cola; la línea se ubica antes de la
// primera OT cuyo inicio (acumulado) cae después del momento actual. Para eso se
// calcula cuántos minutos de trabajo caben ANTES de ahora, sumando la porción ya
// transcurrida de cada turno (respeta los huecos entre mañana y tarde).
export function indiceLineaAhora(dia: DiaSnap): number | null {
  if (!dia.esHoy || dia.ahoraMin === null || dia.turnos.length === 0) return null;
  const ahora = dia.ahoraMin;

  let disponibleAntes = 0;
  for (const t of dia.turnos) {
    const ini = horaAMin(t.horaInicio);
    const fin = horaAMin(t.horaFin);
    if (ahora >= fin) disponibleAntes += t.minutos;
    else if (ahora > ini) disponibleAntes += ahora - ini;
  }

  let acumulado = 0;
  for (let i = 0; i < dia.ots.length; i++) {
    if (acumulado >= disponibleAntes) return i;
    acumulado += dia.ots[i].duracionMin;
  }
  return dia.ots.length; // todo el trabajo del día quedó antes de ahora
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
