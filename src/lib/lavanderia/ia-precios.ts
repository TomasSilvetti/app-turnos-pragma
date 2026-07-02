// Precios de la API de Claude en USD por millón de tokens.
// Fuente: tarifas públicas de Anthropic. Actualizar acá si cambian.
// El costo se congela al momento de registrar el uso (ver registrarUsoIA),
// así el histórico no se altera si estos números cambian después.

export type PrecioModelo = { input: number; output: number };

// Multiplicadores de caché respecto al precio de input.
const CACHE_ESCRITURA_MULT = 1.25; // tokens escritos a caché (~1.25x)
const CACHE_LECTURA_MULT = 0.1; // tokens leídos de caché (~0.1x)

const PRECIOS: Record<string, PrecioModelo> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

// Fallback conservador si aparece un modelo desconocido: se usa Sonnet.
const PRECIO_DEFAULT: PrecioModelo = { input: 3, output: 15 };

export function precioDeModelo(modelo: string): PrecioModelo {
  return PRECIOS[modelo] ?? PRECIO_DEFAULT;
}

export type UsoTokens = {
  inputTokens: number;
  outputTokens: number;
  cacheCreacionTokens: number;
  cacheLecturaTokens: number;
};

// Costo en USD de una llamada, dado el modelo y los tokens del objeto usage.
export function calcularCostoUsd(modelo: string, uso: UsoTokens): number {
  const p = precioDeModelo(modelo);
  const porMillon = (tokens: number, precio: number) => (tokens / 1_000_000) * precio;

  return (
    porMillon(uso.inputTokens, p.input) +
    porMillon(uso.outputTokens, p.output) +
    porMillon(uso.cacheCreacionTokens, p.input * CACHE_ESCRITURA_MULT) +
    porMillon(uso.cacheLecturaTokens, p.input * CACHE_LECTURA_MULT)
  );
}
