// Helpers de fecha para el tablero. El "dia actual" se calcula en la zona
// horaria de Argentina, independientemente del server. Formato interno: yyyy-MM-dd.

const TZ = "America/Argentina/Buenos_Aires";

// Devuelve { fecha: "yyyy-MM-dd", minutos: minutos desde medianoche, diaSemana: 0-6 } "ahora" en AR.
export function ahoraAR(): { fecha: string; minutos: number; diaSemana: number } {
  const ahora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(ahora);

  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const fecha = `${get("year")}-${get("month")}-${get("day")}`;
  const hh = parseInt(get("hour"), 10);
  const mm = parseInt(get("minute"), 10);
  const diaSemana = diaSemanaDe(fecha);
  return { fecha, minutos: hh * 60 + mm, diaSemana };
}

export function hoyAR(): string {
  return ahoraAR().fecha;
}

// Convierte una Date a "yyyy-MM-dd" en la zona horaria de Argentina.
export function fechaARDe(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// diaSemana 0=Domingo .. 6=Sabado para una fecha yyyy-MM-dd (interpretada como local AR).
export function diaSemanaDe(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

// Convierte "HH:mm" a minutos desde medianoche.
export function horaAMin(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

// Etiqueta corta del dia: "Lun 23/06".
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export function etiquetaDia(fecha: string): { dia: string; fechaCorta: string } {
  const [, m, d] = fecha.split("-");
  return { dia: DIAS[diaSemanaDe(fecha)], fechaCorta: `${d}/${m}` };
}
