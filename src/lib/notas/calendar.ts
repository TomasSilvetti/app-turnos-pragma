// Helpers de fechas y franjas horarias para el calendario de notas.
// Trabaja con strings "yyyy-MM-dd" en hora local del dispositivo.

export type Franja = "manana" | "tarde" | "noche";

// Franjas del día para la vista semanal.
// mañana 06–12, tarde 12–18, noche 19–21.
export const FRANJAS: { id: Franja; label: string; start: string; end: string; emoji: string }[] = [
  { id: "manana", label: "Mañana", start: "06:00", end: "12:00", emoji: "🌅" },
  { id: "tarde", label: "Tarde", start: "12:00", end: "18:00", emoji: "☀️" },
  { id: "noche", label: "Noche", start: "19:00", end: "21:00", emoji: "🌙" },
];

export const CALENDAR_COLORS = [
  { name: "blue", value: "#3b82f6" },
  { name: "green", value: "#22c55e" },
  { name: "red", value: "#ef4444" },
  { name: "amber", value: "#f59e0b" },
  { name: "violet", value: "#8b5cf6" },
  { name: "teal", value: "#14b8a6" },
] as const;

export function colorHex(name: string): string {
  return CALENDAR_COLORS.find((c) => c.name === name)?.value ?? CALENDAR_COLORS[0].value;
}

export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function hoyStr(): string {
  return toDateStr(new Date());
}

// Grilla del mes: siempre 6 semanas (42 celdas) empezando en domingo, para que
// la altura de la grilla no salte entre meses.
export function monthGrid(year: number, month: number): Date[] {
  const primero = new Date(year, month, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - primero.getDay()); // retrocede hasta el domingo previo
  const dias: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    dias.push(d);
  }
  return dias;
}

// Los 7 días de la semana que contiene `ref`, empezando en domingo.
export function weekDays(ref: Date): Date[] {
  const inicio = new Date(ref);
  inicio.setDate(ref.getDate() - ref.getDay());
  const dias: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    dias.push(d);
  }
  return dias;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function addDays(d: Date, delta: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + delta);
  return r;
}

// ¿La hora "HH:mm" cae dentro de la franja? (para agrupar eventos en la vista semanal)
export function franjaDeHora(time: string): Franja {
  const [h] = time.split(":").map(Number);
  if (h >= 6 && h < 12) return "manana";
  if (h >= 12 && h < 19) return "tarde";
  return "noche";
}
