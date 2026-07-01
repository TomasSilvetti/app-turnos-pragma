"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Maneja el estado de "OT resaltada por búsqueda": qué OT resaltar, qué columna
// forzar abierta (las de días futuros vienen colapsadas) y el scroll fluido hacia
// la tarjeta. El resaltado se limpia solo cuando termina la animación.
export function useResaltarOT() {
  const [resaltadaId, setResaltadaId] = useState<string | null>(null);
  const [expandidaFecha, setExpandidaFecha] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const limpiarTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => () => limpiarTimers(), []);

  const resaltar = useCallback((otId: string, fecha: string) => {
    limpiarTimers();
    // Fuerza la expansión de la columna (aunque sea de un día futuro).
    setExpandidaFecha(fecha);
    setResaltadaId(otId);
    // Esperamos un frame a que la columna se expanda y la tarjeta se monte antes
    // de hacer scroll hacia ella.
    timers.current.push(
      setTimeout(() => {
        document.getElementById(`ot-card-${otId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 160)
    );
    // La animación de resaltado dura ~3s; después la quitamos.
    timers.current.push(setTimeout(() => setResaltadaId(null), 3200));
    // 5s después de terminar la animación dejamos de forzar la columna abierta.
    // Si el cursor sigue encima, el :hover la mantiene expandida; si no, colapsa.
    timers.current.push(setTimeout(() => setExpandidaFecha(null), 8000));
  }, []);

  return { resaltadaId, expandidaFecha, resaltar };
}
