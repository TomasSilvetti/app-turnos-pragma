"use client";

import { createContext, useContext } from "react";

// Permite que las tarjetas (ItemOT), anidadas varios niveles, refresquen el
// tablero tras empezar/terminar una OT sin pasar la función por props.
const TableroAccionesContext = createContext<{ refrescar: () => Promise<void> }>({
  refrescar: async () => {},
});

export const TableroAccionesProvider = TableroAccionesContext.Provider;

export function useTableroAcciones() {
  return useContext(TableroAccionesContext);
}
