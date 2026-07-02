"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { lavFetch } from "@/lib/lavanderia/client";
import type { ConsumoIAResumen } from "@/app/api/lavanderia/ia-consumo/route";

// Formato USD con hasta 4 decimales (los montos suelen ser chicos).
const usd = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "USD", maximumFractionDigits: 4 });

const fechaCorta = (yyyymmdd: string) => {
  const [, m, d] = yyyymmdd.split("-");
  return `${d}/${m}`;
};

const horaMin = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ConsumoIA() {
  const [data, setData] = useState<ConsumoIAResumen | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    lavFetch("/api/lavanderia/ia-consumo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ConsumoIAResumen | null) => setData(d))
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

  if (!data) {
    return (
      <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No se pudo cargar el consumo.
      </p>
    );
  }

  const chart = data.porDia.map((d) => ({ ...d, etiqueta: fechaCorta(d.fecha) }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Consumo de IA</h1>
        <p className="text-sm text-muted-foreground">
          Gasto de la API de Claude, cobrado a costo. Los montos son los que factura Anthropic.
        </p>
      </div>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Costo del mes</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{usd(data.mes.costoUsd)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.mes.requests} escaneo{data.mes.requests === 1 ? "" : "s"} · {data.mes.tokens.toLocaleString("es-AR")} tokens
          </p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Escaneos del mes</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{data.mes.requests}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total histórico</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{usd(data.total.costoUsd)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{data.total.requests} escaneos en total</p>
        </div>
      </div>

      {/* Gráfico por día */}
      {chart.length > 0 && (
        <div className="h-64 rounded-xl border border-border p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v: number) => [usd(v), "Costo"]}
                labelFormatter={(l) => `Día ${l}`}
              />
              <Bar name="Costo" dataKey="costoUsd" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detalle reciente */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Últimos registros</h2>
        {data.recientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Todavía no hay consumo registrado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="p-2.5 font-semibold">Fecha</th>
                  <th className="p-2.5 font-semibold">Modelo</th>
                  <th className="p-2.5 text-right font-semibold">Tokens in</th>
                  <th className="p-2.5 text-right font-semibold">Tokens out</th>
                  <th className="p-2.5 text-right font-semibold">Costo</th>
                </tr>
              </thead>
              <tbody>
                {data.recientes.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2.5 whitespace-nowrap">{horaMin(r.creadoEn)}</td>
                    <td className="p-2.5 text-slate-500">{r.modelo}</td>
                    <td className="p-2.5 text-right">{r.inputTokens.toLocaleString("es-AR")}</td>
                    <td className="p-2.5 text-right">{r.outputTokens.toLocaleString("es-AR")}</td>
                    <td className="p-2.5 text-right font-medium">{usd(r.costoUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
