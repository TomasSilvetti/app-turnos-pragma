"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, UserCheck, UserX, ShieldCheck, KeyRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lavFetch } from "@/lib/lavanderia/client";
import { useEmpleado } from "@/components/lavanderia/EmpleadoProvider";
import { cn } from "@/lib/utils";

type Row = { id: string; nombre: string; esAdmin: boolean; activo: boolean; email: string | null };

const inputCls =
  "h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary";

export function GestionEmpleados() {
  const { recargarEmpleados } = useEmpleado();
  const [rows, setRows] = useState<Row[]>([]);
  const [cargando, setCargando] = useState(true);

  // Alta
  const [nombre, setNombre] = useState("");
  const [esAdmin, setEsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorAlta, setErrorAlta] = useState<string | null>(null);

  // Edicion de credenciales por fila (id del empleado en edicion)
  const [editando, setEditando] = useState<string | null>(null);
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credPromover, setCredPromover] = useState(false);
  const [guardandoCred, setGuardandoCred] = useState(false);
  const [errorCred, setErrorCred] = useState<string | null>(null);

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
    setErrorAlta(null);
    try {
      const res = await lavFetch("/api/lavanderia/empleados", {
        method: "POST",
        body: JSON.stringify({ nombre: nom, esAdmin, email, password }),
      });
      if (res.ok) {
        setNombre("");
        setEsAdmin(false);
        setEmail("");
        setPassword("");
        cargar();
        recargarEmpleados();
      } else {
        const d = await res.json().catch(() => ({}));
        setErrorAlta(d.error ?? "No se pudo crear");
      }
    } finally {
      setCreando(false);
    }
  };

  const actualizar = async (id: string, data: Record<string, unknown>) => {
    const res = await lavFetch(`/api/lavanderia/empleados/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { empleado } = await res.json();
      setRows((arr) => arr.map((x) => (x.id === id ? empleado : x)));
      recargarEmpleados();
      return true;
    }
    return res;
  };

  const abrirCred = (row: Row, promover: boolean) => {
    setEditando(row.id);
    setCredEmail(row.email ?? "");
    setCredPassword("");
    setCredPromover(promover);
    setErrorCred(null);
  };

  const guardarCred = async (id: string) => {
    setGuardandoCred(true);
    setErrorCred(null);
    try {
      const payload: Record<string, unknown> = {};
      if (credEmail.trim()) payload.email = credEmail.trim();
      if (credPassword) payload.password = credPassword;
      if (credPromover) payload.esAdmin = true;
      const res = await lavFetch(`/api/lavanderia/empleados/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const { empleado } = await res.json();
        setRows((arr) => arr.map((x) => (x.id === id ? empleado : x)));
        recargarEmpleados();
        setEditando(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setErrorCred(d.error ?? "No se pudo guardar");
      }
    } finally {
      setGuardandoCred(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Empleados</h1>
        <p className="text-sm text-muted-foreground">
          Creá empleados y activá o desactivá su acceso. Los administradores ingresan con email y contraseña; los empleados aparecen en el selector del navbar.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del empleado"
            className={cn(inputCls, "w-56")}
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

        {esAdmin && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email del admin"
              className={cn(inputCls, "w-56")}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className={cn(inputCls, "w-56")}
            />
            <span className="text-xs text-muted-foreground">Mín. 1 mayúscula y 1 carácter especial.</span>
          </div>
        )}

        {errorAlta && <p className="text-sm text-red-500">{errorAlta}</p>}
      </div>

      {cargando ? (
        <div className="flex justify-center py-12 text-muted-foreground">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((e) => (
            <li key={e.id} className={cn("p-3", !e.activo && "opacity-60")}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{e.nombre}</span>
                  {e.esAdmin && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <ShieldCheck className="size-3" /> admin
                    </span>
                  )}
                  {e.email && <span className="truncate text-xs text-muted-foreground">{e.email}</span>}
                  {!e.activo && <span className="text-xs text-muted-foreground">inactivo</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {e.esAdmin ? (
                    <Button size="sm" variant="ghost" onClick={() => abrirCred(e, false)}>
                      <KeyRound /> Credenciales
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => abrirCred(e, true)}>
                      Hacer admin
                    </Button>
                  )}
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
              </div>

              {editando === e.id && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-2">
                  <input
                    type="email"
                    value={credEmail}
                    onChange={(ev) => setCredEmail(ev.target.value)}
                    placeholder="Email"
                    className={cn(inputCls, "w-52")}
                  />
                  <input
                    type="password"
                    value={credPassword}
                    onChange={(ev) => setCredPassword(ev.target.value)}
                    placeholder={credPromover ? "Contraseña" : "Nueva contraseña (opcional)"}
                    className={cn(inputCls, "w-52")}
                  />
                  <Button size="sm" onClick={() => guardarCred(e.id)} disabled={guardandoCred}>
                    {guardandoCred ? <Loader2 className="animate-spin" /> : "Guardar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditando(null)}>
                    <X />
                  </Button>
                  {errorCred && <p className="w-full text-sm text-red-500">{errorCred}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
