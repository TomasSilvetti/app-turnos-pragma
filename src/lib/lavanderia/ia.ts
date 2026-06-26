import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { hoyAR } from "./fecha";

// Modelo de visión configurable. Sonnet da buen balance OCR/costo para tickets.
const MODELO = process.env.LAV_IA_MODEL || "claude-sonnet-4-6";

export type ItemExtraido = {
  descripcion: string;
  cantidad: number;
  precio: number | null; // precio de la linea tal como figura en el ticket
  prendaId: string | null;
  prendaNombre: string | null;
  servicioIds: string[]; // servicios detectados, mapeados a los conocidos
  servicios: string[]; // nombres de esos servicios
};

export type OTExtraida = {
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  total: number | null;
  fechaTicket: string | null;
  urgente: boolean;
  fechaNecesaria: string | null; // yyyy-MM-dd, de "PARA DD/MM"
  items: ItemExtraido[];
};

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const TOOL = {
  name: "cargar_ot",
  description: "Carga los datos extraídos de una orden de trabajo (ticket) de lavandería.",
  input_schema: {
    type: "object" as const,
    properties: {
      numero: { type: ["string", "null"], description: "Número de OT, ej OT:0003-00001226 → 1226" },
      nombreCliente: { type: ["string", "null"] },
      telefono: { type: ["string", "null"] },
      domicilio: { type: ["string", "null"] },
      total: { type: ["number", "null"], description: "Monto total en número, sin símbolos" },
      fechaTicket: { type: ["string", "null"], description: "Fecha/hora tal como figura en el ticket" },
      urgente: {
        type: "boolean",
        description: 'true SOLO si en el ticket está escrita la palabra "URGENTE" (impresa o a mano). Si no aparece, false.',
      },
      fechaNecesaria: {
        type: ["string", "null"],
        description:
          'Si el ticket dice "PARA <fecha>" (ej "PARA 30/06"), la fecha en formato yyyy-MM-dd. Inferí el año según la fecha de hoy indicada en el texto. Si no hay una fecha pedida, null.',
      },
      items: {
        type: "array",
        description: "Cada prenda o servicio del ticket",
        items: {
          type: "object",
          properties: {
            descripcion: { type: "string", description: "Texto de la prenda/servicio tal como aparece" },
            cantidad: { type: "number" },
            precio: {
              type: ["number", "null"],
              description:
                "Precio que figura en esa línea del ticket, en número sin símbolos ni puntos de miles (ej '$ 18.600,00' → 18600). Si la línea no muestra precio, null.",
            },
            prendaSugerida: {
              type: ["string", "null"],
              description: "Nombre EXACTO de la lista de prendas conocidas que corresponde, o null",
            },
            serviciosSugeridos: {
              type: "array",
              items: { type: "string" },
              description:
                "Servicios aplicados a esa prenda (ej. LIMPIEZA, PLANCHADO). Usá los nombres EXACTOS de la lista de servicios conocidos cuando coincidan; si no hay coincidencia, dejá el texto tal como aparece.",
            },
          },
          required: ["descripcion", "cantidad"],
        },
      },
    },
    required: ["items"],
  },
};

// Procesa la foto de un ticket con Claude y devuelve los datos estructurados,
// mapeando cada item a una prenda de la matriz cuando es posible.
export async function escanearComanda(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<OTExtraida> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Falta ANTHROPIC_API_KEY: configurá la API key de Claude para escanear comandas.");
  }

  const [prendas, servicios] = await Promise.all([
    prisma.lavPrenda.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavServicio.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const listaPrendas = prendas.map((p) => `- ${p.nombre}`).join("\n");
  const listaServicios = servicios.map((s) => `- ${s.nombre}`).join("\n");

  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODELO,
    max_tokens: 1024,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "cargar_ot" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text:
              "Esta es la foto de una orden de trabajo (ticket) de una lavandería. " +
              `Hoy es ${hoyAR()} (yyyy-MM-dd). ` +
              "Extraé los datos y los items. Detectá también si está escrita la palabra URGENTE (urgente=true) " +
              'y si dice "PARA <fecha>" (devolvé fechaNecesaria en yyyy-MM-dd, infiriendo el año a partir de hoy). ' +
              "Para cada item, detectá el precio que figura en su línea (campo precio, número sin símbolos). " +
              "Cada item es una PRENDA con uno o más SERVICIOS aplicados. " +
              "Indicá la prenda en prendaSugerida (nombre EXACTO de la lista de prendas, o null) y " +
              "los servicios en serviciosSugeridos (nombres EXACTOS de la lista de servicios cuando coincidan).\n\n" +
              "PRENDAS conocidas:\n" +
              (listaPrendas || "(no hay prendas configuradas)") +
              "\n\nSERVICIOS conocidos:\n" +
              (listaServicios || "(no hay servicios configurados)"),
          },
        ],
      },
    ],
  });

  const bloque = res.content.find((c) => c.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    throw new Error("La IA no devolvió datos estructurados.");
  }
  const data = bloque.input as {
    numero?: string | null;
    nombreCliente?: string | null;
    telefono?: string | null;
    domicilio?: string | null;
    total?: number | null;
    fechaTicket?: string | null;
    urgente?: boolean | null;
    fechaNecesaria?: string | null;
    items?: {
      descripcion: string;
      cantidad: number;
      precio?: number | null;
      prendaSugerida?: string | null;
      serviciosSugeridos?: string[] | null;
    }[];
  };

  const fechaNecesaria =
    typeof data.fechaNecesaria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.fechaNecesaria)
      ? data.fechaNecesaria
      : null;

  const indicePorNombre = new Map(prendas.map((p) => [normalizar(p.nombre), p]));
  const servicioPorNombre = new Map(servicios.map((s) => [normalizar(s.nombre), s]));

  const items: ItemExtraido[] = (data.items ?? []).map((it) => {
    const match = it.prendaSugerida ? indicePorNombre.get(normalizar(it.prendaSugerida)) : undefined;
    const servMatches = (it.serviciosSugeridos ?? [])
      .map((nombre) => servicioPorNombre.get(normalizar(nombre)))
      .filter((s): s is { id: string; nombre: string } => Boolean(s));
    return {
      descripcion: it.descripcion,
      cantidad: Math.max(1, Math.round(Number(it.cantidad) || 1)),
      precio: typeof it.precio === "number" && Number.isFinite(it.precio) ? Math.max(0, Math.round(it.precio)) : null,
      prendaId: match?.id ?? null,
      prendaNombre: match?.nombre ?? null,
      servicioIds: servMatches.map((s) => s.id),
      servicios: servMatches.map((s) => s.nombre),
    };
  });

  return {
    numero: data.numero ?? null,
    nombreCliente: data.nombreCliente ?? null,
    telefono: data.telefono ?? null,
    domicilio: data.domicilio ?? null,
    total: typeof data.total === "number" ? data.total : null,
    fechaTicket: data.fechaTicket ?? null,
    urgente: data.urgente === true,
    fechaNecesaria,
    items,
  };
}
