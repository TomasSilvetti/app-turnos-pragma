"use client";

import { useEffect, useState } from "react";

// true en pantallas chicas (celular). El celular muestra el modo "cargar OT";
// el desktop, el tablero.
export function useEsMobile(maxWidth = 768): boolean {
  const [esMobile, setEsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const actualizar = () => setEsMobile(mq.matches);
    actualizar();
    mq.addEventListener("change", actualizar);
    return () => mq.removeEventListener("change", actualizar);
  }, [maxWidth]);

  return esMobile;
}
