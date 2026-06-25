"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { lavFetch } from "@/lib/lavanderia/client";
import { formatoDuracion } from "@/lib/lavanderia/timeline";
import type { MetricaEmpleado } from "@/app/api/lavanderia/metricas/route";

export function MetricasEmpleados() {
  const [metricas, setMetricas] = useState<MetricaEmpleado[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    lavFetch("/api/lavanderia/metricas")
      .then((r) => (r.ok ? r.json() : { metricas: [] }))
      .then((d: { metricas: MetricaEmpleado[] }) => setMetricas(d.metricas ?? []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Métricas de empleados</h1>
        <p className="text-sm text-muted-foreground">Trabajos realizados y tiempos por empleado.</p>
      </div>

      {metricas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          Todavía no hay trabajos registrados.
        </p>
      ) : (
        <>
          <div className="h-64 rounded-xl border border-border p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricas} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar name="Trabajadas" dataKey="trabajadas" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar name="Terminadas" dataKey="terminadas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2.5 font-semibold">Empleado</th>
                  <th className="p-2.5 text-right font-semibold">Trabajadas</th>
                  <th className="p-2.5 text-right font-semibold">Terminadas</th>
                  <th className="p-2.5 text-right font-semibold">Tiempo trabajado</th>
                  <th className="p-2.5 text-right font-semibold">Promedio real</th>
                </tr>
              </thead>
              <tbody>
                {metricas.map((m) => (
                  <tr key={m.empleadoId} className="border-t border-border">
                    <td className="p-2.5 font-medium">{m.nombre}</td>
                    <td className="p-2.5 text-right">{m.trabajadas}</td>
                    <td className="p-2.5 text-right">{m.terminadas}</td>
                    <td className="p-2.5 text-right">{formatoDuracion(m.minutosTrabajados)}</td>
                    <td className="p-2.5 text-right">{m.tiempoPromedioMin > 0 ? formatoDuracion(m.tiempoPromedioMin) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
