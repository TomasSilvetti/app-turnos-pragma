"use client";

// El effect inicializa el empleado activo leyendo localStorage (sistema externo).
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredEmpleadoId, setStoredEmpleadoId, lavFetch } from "@/lib/lavanderia/client";

export type Empleado = { id: string; nombre: string; esAdmin: boolean };
type ModoVista = "empleado" | "admin";

type Ctx = {
  empleados: Empleado[];
  empleadoActivo: Empleado | null;
  ready: boolean;
  modo: ModoVista;
  seleccionar: (id: string) => void;
  setModo: (modo: ModoVista) => void;
  recargarEmpleados: () => void;
};

const EmpleadoContext = createContext<Ctx>({
  empleados: [],
  empleadoActivo: null,
  ready: false,
  modo: "empleado",
  seleccionar: () => {},
  setModo: () => {},
  recargarEmpleados: () => {},
});

export function useEmpleado() {
  return useContext(EmpleadoContext);
}

export function EmpleadoProvider({ children }: { children: React.ReactNode }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [activoId, setActivoId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [modo, setModoState] = useState<ModoVista>("empleado");

  const recargarEmpleados = useCallback(() => {
    lavFetch("/api/lavanderia/empleados")
      .then((r) => (r.ok ? r.json() : { empleados: [] }))
      .then((d: { empleados: Empleado[] }) => setEmpleados(d.empleados ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const guardado = getStoredEmpleadoId();
    setActivoId(guardado);
    setReady(true);
    recargarEmpleados();
  }, [recargarEmpleados]);

  const seleccionar = useCallback((id: string) => {
    setStoredEmpleadoId(id);
    setActivoId(id);
  }, []);

  const setModo = useCallback((m: ModoVista) => setModoState(m), []);

  const empleadoActivo = useMemo(
    () => empleados.find((e) => e.id === activoId) ?? null,
    [empleados, activoId]
  );

  // Si el empleado activo no es admin, forzar modo empleado.
  useEffect(() => {
    if (empleadoActivo && !empleadoActivo.esAdmin && modo !== "empleado") {
      setModoState("empleado");
    }
  }, [empleadoActivo, modo]);

  const value: Ctx = {
    empleados,
    empleadoActivo,
    ready,
    modo,
    seleccionar,
    setModo,
    recargarEmpleados,
  };

  return <EmpleadoContext.Provider value={value}>{children}</EmpleadoContext.Provider>;
}
