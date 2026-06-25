"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, UserCheck, UserX, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { useEmpleado } from "@/components/lavanderia/EmpleadoProvider";
import { cn } from "@/lib/utils";

type Row = { id: string; nombre: string; esAdmin: boolean; activo: boolean };

export function GestionEmpleados() {
  const { recargarEmpleados } = useEmpleado();
  const [rows, setRows] = useState<Row[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(() => {
    lavFetch("/api/lavanderia/empleados?todos=1")
      .then((r) => (r.ok ? r.json() : { empleados: [] }))
      .then((d: { empleados: Row[] }) => setRows(d.empleados ?? []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => cargar(), [cargar]);

  const crear = async () => {
    const nom = nombre.trim();
    if (!nom) return;
    setCreando(true);
    try {
      const res = await lavFetch("/api/lavanderia/empleados", {
        method: "POST",
        body: JSON.stringify({ nombre: nom, esAdmin }),
      });
      if (res.ok) {
        setNombre("");
        setEsAdmin(false);
        cargar();
        recargarEmpleados();
      }
    } finally {
      setCreando(false);
    }
  };

  const actualizar = async (id: string, data: Partial<Pick<Row, "activo" | "esAdmin">>) => {
    const res = await lavFetch(`/api/lavanderia/empleados/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { empleado } = await res.json();
      setRows((arr) => arr.map((x) => (x.id === id ? empleado : x)));
      recargarEmpleados();
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Empleados</h1>
        <p className="text-sm text-muted-foreground">
          Creá empleados y activá o desactivá su acceso. Los activos aparecen en el selector del navbar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && crear()}
          placeholder="Nombre del empleado"
          className="h-9 w-56 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={esAdmin} onChange={(e) => setEsAdmin(e.target.checked)} />
          Administrador
        </label>
        <Button size="sm" onClick={crear} disabled={creando || !nombre.trim()}>
          {creando ? <Loader2 className="animate-spin" /> : <Plus />}
          Crear
        </Button>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((e) => (
            <li key={e.id} className={cn("flex items-center justify-between gap-3 p-3", !e.activo && "opacity-60")}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{e.nombre}</span>
                {e.esAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <ShieldCheck className="size-3" /> admin
                  </span>
                )}
                {!e.activo && <span className="text-xs text-muted-foreground">inactivo</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => actualizar(e.id, { esAdmin: !e.esAdmin })}>
                  {e.esAdmin ? "Quitar admin" : "Hacer admin"}
                </Button>
                {e.activo ? (
                  <Button size="sm" variant="destructive" onClick={() => actualizar(e.id, { activo: false })}>
                    <UserX /> Desactivar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => actualizar(e.id, { activo: true })}>
                    <UserCheck /> Activar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
