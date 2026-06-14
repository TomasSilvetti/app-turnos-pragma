// Colores de texto pedidos: rojo, verde, azul. Hex explícito para que se vean
// igual en modo claro y oscuro.
export const TEXT_COLORS = [
  { name: "Rojo", value: "#ef4444" },
  { name: "Verde", value: "#22c55e" },
  { name: "Azul", value: "#3b82f6" },
] as const;

// Paleta para los "puntitos de colores" del contador sin objetivo.
export const DOT_PALETTE = [
  "#ef4444", "#f59e0b", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

export function dotColor(index: number): string {
  return DOT_PALETTE[index % DOT_PALETTE.length];
}
