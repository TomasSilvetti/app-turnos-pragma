// Tipos y helpers compartidos por la UI de la sección Trabajo.

export type EstadoItem = "propuesto" | "pendiente" | "en_curso" | "pausada" | "bloqueado" | "completado";
export type Carril = "trabajo" | "itemizacion";

export const NOMBRE_CARRIL: Record<Carril, string> = {
  trabajo: "Features",
  itemizacion: "Itemizador",
};
export type TipoLog = "hito" | "problema" | "solucion" | "bloqueo" | "handoff";

export type ImagenTrabajo = { id: string; url: string; ancho: number; alto: number };

export type PromptTrabajo = {
  id: string;
  tipo: "inicial" | "desbloqueo";
  contenido: object;
  createdAt: string;
  imagenes?: ImagenTrabajo[];
};

export type LogTrabajo = {
  id: string;
  tipo: TipoLog;
  texto: string;
  paso: number | null;
  cuenta: string | null;
  requiereIntervencion: boolean;
  createdAt: string;
  imagenes?: ImagenTrabajo[];
};

export type ItemTrabajo = {
  id: string;
  titulo: string;
  estado: EstadoItem;
  orden: number;
  proyecto: string;
  pasoActual: number;
  pasosTotales: number;
  intentos: number;
  sesionInicio: string | null;
  cuenta: string | null;
  motivoBloqueo: string | null;
  // Sólo en los que salieron de un informe: qué archivo y qué parte.
  fuenteArchivo?: string | null;
  fuenteAncla?: string | null;
  // El informe se editó después de que se escribió este ítem.
  fuenteCambiada?: boolean;
  pedidoArchivoId?: string | null;
  createdAt: string;
  updatedAt: string;
  completadoEn: string | null;
  _count?: { logs: number };
  prompts?: PromptTrabajo[];
  logs?: LogTrabajo[];
};

export type CuentaHarness = {
  id: string;
  nombre: string;
  email: string | null;
  habilitada: boolean;
  carril: Carril | null;
  estado: "activa" | "agotada" | "login_requerido";
  tokensVentana: number;
  techoObservado: number | null;
  resetAt: string | null;
  ventanaInicio: string | null;
  ultimaSesionAt: string | null;
};

export type EstadoCarril = {
  carril: Carril;
  vivo: boolean;
  encendido: boolean;
  estado: "detenido" | "ocioso" | "trabajando";
  itemEnCurso: { id: string; titulo: string; pasoActual: number; pasosTotales: number; intentos: number } | null;
  sesionInicio: string | null;
  cuentaActual: string | null;
  limiteSesionMin: number;
  actualizadoAt: string | null;
};

export type EventoHarness = {
  id: string;
  carril: Carril;
  tipo: "arranque" | "apagado" | "cuota" | "error" | "info";
  texto: string;
  createdAt: string;
};

export type EstadoHarness = {
  carriles: EstadoCarril[];
  cuentas: CuentaHarness[];
  vivo: boolean;
  estado: "detenido" | "ocioso" | "trabajando";
  itemEnCurso: EstadoCarril["itemEnCurso"];
  sesionInicio: string | null;
  cuentaActual: string | null;
  limiteSesionMin: number;
  actualizadoAt: string | null;
};

// El techo de cuota no se puede consultar: se aprende cuando una cuenta corta.
// Una cuenta que todavía no cortó nunca toma prestado el mayor techo observado
// entre las demás — son todas del mismo plan, así que sirve de referencia y
// permite mostrar un porcentaje desde el primer corte de cualquiera.
export function porcentajeCuota(cuenta: CuentaHarness, cuentas: CuentaHarness[]): number | null {
  if (cuenta.estado === "agotada") return 100;
  const techo = cuenta.techoObservado ?? Math.max(0, ...cuentas.map((c) => c.techoObservado ?? 0));
  if (!techo) return null;
  return Math.min(100, Math.round((cuenta.tokensVentana / techo) * 100));
}

export type SugerenciaTrabajo = {
  id: string;
  titulo: string;
  proyecto: string;
  desdeBid: string;
  hastaBid: string;
  orden: number;
};

export type EstadoBandeja = "vacia" | "lista" | "pendiente" | "analizando" | "error";

export type Bandeja = {
  id: string;
  contenido: object;
  estado: EstadoBandeja;
  error: string | null;
  pedidoEn: string | null;
  updatedAt: string;
  sugerencias: SugerenciaTrabajo[];
};

// Los proyectos sobre los que puede trabajar el harness. Tiene que coincidir con
// las claves de harness-cuentas/proyectos.json: si acá dice algo que allá no
// existe, la sesión arranca en el proyecto por defecto sin avisar.
export const PROYECTOS = ["app-turnos", "construia"];

export type EstadoPedidoArchivo = "pendiente" | "analizando" | "listo" | "error";

// Un archivo de la notebook mandado a itemizar desde la consola. Guarda la ruta
// y nada del contenido: el informe vive en la máquina donde corre el harness.
export type PedidoArchivo = {
  id: string;
  ruta: string;
  nombre: string;
  alcance: string;
  estado: EstadoPedidoArchivo;
  error: string | null;
  itemsCreados: number;
  pedidoEn: string | null;
  createdAt: string;
  updatedAt: string;
};

export const LISTAS = {
  propuestos: { titulo: "Propuestos por el itemizador", estado: "propuesto" as const },
  pendiente: { titulo: "Lista de trabajo pendiente", estado: "pendiente" as const },
  bloqueados: { titulo: "Bloqueados", estado: "bloqueado" as const },
  completados: { titulo: "Trabajo completado", estado: "completado" as const },
};

export type ClaveLista = keyof typeof LISTAS;

export function esClaveLista(v: string): v is ClaveLista {
  return v in LISTAS;
}

export const DOC_VACIO = { type: "doc", content: [{ type: "paragraph" }] };

// El progreso sale de los pasos numerados que declara el prompt. Sin pasos no se
// dibuja la barra: un 0→100 de golpe no dice nada que el checkbox no diga ya.
export function porcentaje(item: { pasoActual: number; pasosTotales: number; estado: EstadoItem }): number | null {
  if (item.estado === "completado") return 100;
  if (item.pasosTotales <= 0) return null;
  return Math.min(100, Math.round((item.pasoActual / item.pasosTotales) * 100));
}

export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// "1 h 12 min" — el cronómetro de la sesión en curso contra el techo del runner.
export function duracion(desde: string, hasta = Date.now()): string {
  const min = Math.max(0, Math.floor((hasta - new Date(desde).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}
