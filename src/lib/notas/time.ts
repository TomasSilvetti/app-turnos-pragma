const TZ = "America/Argentina/Buenos_Aires";

export type BuenosAiresParts = {
  dateStr: string; // yyyy-MM-dd
  hh: number; // 0-23
  mm: number; // 0-59
  dow: number; // 0=domingo ... 6=sábado (igual que Date.getDay)
};

// Descompone un instante en sus partes según la zona horaria de Buenos Aires.
export function getBuenosAiresParts(date: Date = new Date()): BuenosAiresParts {
  const local = new Date(date.toLocaleString("en-US", { timeZone: TZ }));
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, "0");
  const dd = String(local.getDate()).padStart(2, "0");
  return {
    dateStr: `${yyyy}-${mm}-${dd}`,
    hh: local.getHours(),
    mm: local.getMinutes(),
    dow: local.getDay(),
  };
}

// Para un recordatorio "una sola vez" sin fecha: la próxima vez que ocurra esa hora.
// Si la hora ya pasó hoy (BA), es mañana; si no, hoy.
export function nextOneTimeDate(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const now = getBuenosAiresParts();
  const yaPaso = h < now.hh || (h === now.hh && m <= now.mm);
  if (!yaPaso) return now.dateStr;
  // sumar un día sobre la fecha BA
  const [yyyy, mo, dd] = now.dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(yyyy, mo - 1, dd + 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function esHoraValida(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
