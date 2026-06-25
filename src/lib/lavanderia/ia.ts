import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

// Modelo de visión configurable. Sonnet da buen balance OCR/costo para tickets.
const MODELO = process.env.LAV_IA_MODEL || "claude-sonnet-4-6";

export type ItemExtraido = {
  descripcion: string;
  cantidad: number;
  prendaId: string | null;
  prendaNombre: string | null;
};

export type OTExtraida = {
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  total: number | null;
  fechaTicket: string | null;
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
      items: {
        type: "array",
        description: "Cada prenda o servicio del ticket",
        items: {
          type: "object",
          properties: {
            descripcion: { type: "string", description: "Texto de la prenda/servicio tal como aparece" },
            cantidad: { type: "number" },
            prendaSugerida: {
              type: ["string", "null"],
              description: "Nombre EXACTO de la lista de prendas conocidas que corresponde, o null",
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

  const prendas = await prisma.lavPrenda.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } });
  const listaPrendas = prendas.map((p) => `- ${p.nombre}`).join("\n");

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
              "Extraé los datos y los items. Para cada item, si corresponde a una de estas prendas conocidas, " +
              "indicá su nombre EXACTO en prendaSugerida (si no, null):\n\n" +
              (listaPrendas || "(no hay prendas configuradas)"),
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
    items?: { descripcion: string; cantidad: number; prendaSugerida?: string | null }[];
  };

  const indicePorNombre = new Map(prendas.map((p) => [normalizar(p.nombre), p]));

  const items: ItemExtraido[] = (data.items ?? []).map((it) => {
    const match = it.prendaSugerida ? indicePorNombre.get(normalizar(it.prendaSugerida)) : undefined;
    return {
      descripcion: it.descripcion,
      cantidad: Math.max(1, Math.round(Number(it.cantidad) || 1)),
      prendaId: match?.id ?? null,
      prendaNombre: match?.nombre ?? null,
    };
  });

  return {
    numero: data.numero ?? null,
    nombreCliente: data.nombreCliente ?? null,
    telefono: data.telefono ?? null,
    domicilio: data.domicilio ?? null,
    total: typeof data.total === "number" ? data.total : null,
    fechaTicket: data.fechaTicket ?? null,
    items,
  };
}
