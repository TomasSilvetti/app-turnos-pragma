import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { hoyAR } from "./fecha";
import { calcularCostoUsd } from "./ia-precios";

// Registra el consumo de una llamada a Claude. No debe romper el flujo si falla:
// el escaneo ya terminó, esto es solo contabilidad. El costo se congela acá.
async function registrarUsoIA(
  modelo: string,
  usage: Anthropic.Usage,
  contexto: string
): Promise<void> {
  try {
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const cacheCreacionTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheLecturaTokens = usage.cache_read_input_tokens ?? 0;
    const costoUsd = calcularCostoUsd(modelo, {
      inputTokens,
      outputTokens,
      cacheCreacionTokens,
      cacheLecturaTokens,
    });
    await prisma.lavIAUso.create({
      data: {
        modelo,
        contexto,
        inputTokens,
        outputTokens,
        cacheCreacionTokens,
        cacheLecturaTokens,
        costoUsd,
      },
    });
  } catch (e) {
    console.error("[lavanderia] no se pudo registrar el uso de IA:", e);
  }
}

// Modelo de visión configurable. Sonnet da buen balance OCR/costo para tickets.
const MODELO = process.env.LAV_IA_MODEL || "claude-sonnet-4-6";

export type ItemExtraido = {
  descripcion: string;
  cantidad: number;
  prendaId: string | null;
  prendaNombre: string | null;
  procesoIds: string[]; // procesos detectados, mapeados a los conocidos
  procesos: string[]; // nombres de esos procesos
  esNueva: boolean; // el ticket dice "varios": prenda nueva que todavía no está en el sistema
  precioUnit: number | null; // importe impreso al lado del renglón
  precioTotal: number | null; // precioUnit × cantidad, salvo que el ticket lo diga
};

// "varios" en el ticket = prenda que aún no existe en la matriz; el empleado debe
// reemplazar el nombre y la prenda se da de alta (incompleta) al cargar la OT.
const esVarios = (s: string | null | undefined) =>
  typeof s === "string" && /\bvarios?\b/.test(normalizar(s));

export type OTExtraida = {
  numero: string | null;
  nombreCliente: string | null;
  telefono: string | null;
  domicilio: string | null;
  fechaTicket: string | null;
  urgente: boolean;
  fechaNecesaria: string | null; // yyyy-MM-dd, de "PARA DD/MM"
  totalTicket: number | null; // "TOTAL: $ ..." impreso
  formaPago: string | null; // "Su Pago: CREDITO"
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
      totalTicket: {
        type: ["number", "null"],
        description:
          'Importe del renglón "TOTAL: $ ..." tal como está impreso, como número sin separador de miles (ej "$ 37200.00" → 37200). Si no figura, null.',
      },
      formaPago: {
        type: ["string", "null"],
        description: 'Medio de pago del renglón "Su Pago: ..." (ej CREDITO, DEBITO, EFECTIVO). Si no figura, null.',
      },
      items: {
        type: "array",
        description: "Cada prenda o servicio del ticket",
        items: {
          type: "object",
          properties: {
            descripcion: { type: "string", description: "Texto de la prenda/servicio tal como aparece" },
            cantidad: { type: "number" },
            precioUnit: {
              type: ["number", "null"],
              description:
                "Importe impreso a la derecha de ese renglón, como número sin separador de miles (ej '$ 18600.00' → 18600). Si el renglón no tiene importe, null. No lo calcules ni lo infieras de otros renglones.",
            },
            prendaSugerida: {
              type: ["string", "null"],
              description: "Nombre EXACTO de la lista de prendas conocidas que corresponde, o null",
            },
            procesosSugeridos: {
              type: "array",
              items: { type: "string" },
              description:
                "Procesos/tratamientos aplicados a esa prenda (ej. LIMPIEZA, PLANCHA, MANCHA). Usá los nombres EXACTOS de la lista de procesos conocidos cuando coincidan; si no hay coincidencia, dejá el texto tal como aparece.",
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

  const [prendas, procesos] = await Promise.all([
    prisma.lavPrenda.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.lavProceso.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ]);
  const listaPrendas = prendas.map((p) => `- ${p.nombre}`).join("\n");
  const listaProcesos = procesos.map((p) => `- ${p.nombre}`).join("\n");

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
              "Cada item es una PRENDA con uno o más PROCESOS aplicados. " +
              "Indicá la prenda en prendaSugerida (nombre EXACTO de la lista de prendas, o null) y " +
              "los procesos en procesosSugeridos (nombres EXACTOS de la lista de procesos cuando coincidan). " +
              "Matcheá con cuidado lo que dice el ticket: si algo no coincide claramente con una prenda o " +
              "un proceso conocido, dejalo en null / fuera de la lista en vez de inventar.\n" +
              "Copiá también los IMPORTES tal como están impresos: el de cada renglón en precioUnit, el " +
              'del renglón "TOTAL" en totalTicket y el medio de pago en formaPago. Son transcripciones, ' +
              "no cálculos: si un importe no se lee o no está, poné null en vez de deducirlo.\n" +
              'Si una línea dice "VARIOS", es una prenda que todavía NO está en el sistema: dejá ' +
              'prendaSugerida en null y poné descripcion="varios".\n\n' +
              "PRENDAS conocidas:\n" +
              (listaPrendas || "(no hay prendas configuradas)") +
              "\n\nPROCESOS conocidos:\n" +
              (listaProcesos || "(no hay procesos configurados)"),
          },
        ],
      },
    ],
  });

  await registrarUsoIA(MODELO, res.usage, "escaneo-comanda");

  const bloque = res.content.find((c) => c.type === "tool_use");
  if (!bloque || bloque.type !== "tool_use") {
    throw new Error("La IA no devolvió datos estructurados.");
  }
  const data = bloque.input as {
    numero?: string | null;
    nombreCliente?: string | null;
    telefono?: string | null;
    domicilio?: string | null;
    fechaTicket?: string | null;
    urgente?: boolean | null;
    fechaNecesaria?: string | null;
    totalTicket?: number | null;
    formaPago?: string | null;
    items?: {
      descripcion: string;
      cantidad: number;
      prendaSugerida?: string | null;
      procesosSugeridos?: string[] | null;
      precioUnit?: number | null;
    }[];
  };

  // Importe válido = número finito y no negativo. Cualquier otra cosa es null:
  // preferimos no tener el dato antes que tener uno inventado.
  const importe = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
  };

  const fechaNecesaria =
    typeof data.fechaNecesaria === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data.fechaNecesaria)
      ? data.fechaNecesaria
      : null;

  const indicePorNombre = new Map(prendas.map((p) => [normalizar(p.nombre), p]));
  const procesoPorNombre = new Map(procesos.map((p) => [normalizar(p.nombre), p]));

  // "Valet x kilo" en el ticket nunca trae el proceso escrito, pero siempre lleva
  // Limpieza. Se lo forzamos al detectar esa prenda.
  const procLimpieza = procesoPorNombre.get("limpieza");
  const esValet = (p: { nombre: string } | undefined) =>
    Boolean(p) && normalizar(p!.nombre).includes("valet");

  const items: ItemExtraido[] = (data.items ?? []).map((it) => {
    const match = it.prendaSugerida ? indicePorNombre.get(normalizar(it.prendaSugerida)) : undefined;
    const procMatches = (it.procesosSugeridos ?? [])
      .map((nombre) => procesoPorNombre.get(normalizar(nombre)))
      .filter((p): p is { id: string; nombre: string } => Boolean(p));

    // Forzar Limpieza en Valet x kilo si no vino ya en la lista detectada.
    if (esValet(match) && procLimpieza && !procMatches.some((p) => p.id === procLimpieza.id)) {
      procMatches.unshift(procLimpieza);
    }

    // Valet x kilo va a una máquina especial: la duración es fija (no depende de
    // los kilos), así que la cantidad siempre es 1.
    const cantidad = esValet(match) ? 1 : Math.max(1, Math.round(Number(it.cantidad) || 1));

    // El ticket imprime el importe del renglón completo. Cuando la línea agrupa
    // varias unidades, el unitario se deriva; en Valet la cantidad son kilos y el
    // importe impreso ya es el de la línea, así que no se divide.
    const precioTotal = importe(it.precioUnit);
    const precioUnit =
      precioTotal === null || esValet(match) || cantidad <= 1
        ? precioTotal
        : Math.round((precioTotal / cantidad) * 100) / 100;

    return {
      descripcion: it.descripcion,
      cantidad,
      prendaId: match?.id ?? null,
      prendaNombre: match?.nombre ?? null,
      procesoIds: procMatches.map((p) => p.id),
      procesos: procMatches.map((p) => p.nombre),
      esNueva: !match && (esVarios(it.descripcion) || esVarios(it.prendaSugerida)),
      precioUnit,
      precioTotal,
    };
  });

  return {
    numero: data.numero ?? null,
    nombreCliente: data.nombreCliente ?? null,
    telefono: data.telefono ?? null,
    domicilio: data.domicilio ?? null,
    fechaTicket: data.fechaTicket ?? null,
    urgente: data.urgente === true,
    fechaNecesaria,
    totalTicket: importe(data.totalTicket),
    formaPago: typeof data.formaPago === "string" && data.formaPago.trim() ? data.formaPago.trim() : null,
    items,
  };
}
