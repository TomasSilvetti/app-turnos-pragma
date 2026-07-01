"use client";

import { createContext, useContext } from "react";
import type { OTSnap } from "@/lib/lavanderia/tablero";

// Permite que las tarjetas (ItemOT), anidadas varios niveles, refresquen el
// tablero tras empezar/terminar una OT sin pasar la función por props.
// aplicarLocal: parche optimista del estado de una OT, para feedback instantáneo
// sin esperar al refetch.
const TableroAccionesContext = createContext<{
  refrescar: () => Promise<void>;
  aplicarLocal: (otId: string, patch: Partial<OTSnap>) => void;
  // quitarLocal: saca la OT del tablero al instante (al terminarla).
  quitarLocal: (otId: string) => void;
}>({
  refrescar: async () => {},
  aplicarLocal: () => {},
  quitarLocal: () => {},
});

export const TableroAccionesProvider = TableroAccionesContext.Provider;

export function useTableroAcciones() {
  return useContext(TableroAccionesContext);
}
