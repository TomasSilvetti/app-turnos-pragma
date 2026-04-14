"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";

export type MetricasData = {
  turnosPorMes: { mes: string; cantidad: number }[];
  edadPromedio: number | null;
  distribucionSexos: { sexo: string; cantidad: number }[];
  distribucionTiposTurno: { tipo: string; cantidad: number }[];
};

type Periodo = "semana" | "mes" | "año" | "personalizado";

type Props = {
  data: MetricasData | null;
  loading: boolean;
  periodo?: Periodo;
  range?: { desde: string; hasta: string } | null;
};

const PIE_COLORS = [
  "var(--brand-color)",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#475569",
];

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) {
  if ((percent ?? 0) < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = (Number(innerRadius) + Number(outerRadius)) / 2;
  const x = Number(cx) + r * Math.cos(-Number(midAngle) * RADIAN);
  const y = Number(cy) + r * Math.sin(-Number(midAngle) * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${Math.round((percent ?? 0) * 100)}%`}
    </text>
  );
}

function EmptyBlock() {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-[#6b7280] dark:text-[#94a3b8] italic">
      Todavía no hay datos de clientes
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-28 bg-[#E0E0DB] dark:bg-[#2d3548] rounded mb-4" />
      <div className="h-32 bg-[#E0E0DB] dark:bg-[#2d3548] rounded" />
    </div>
  );
}

function MetricCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5">
      <p className="font-small text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8] mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function formatMes(mes: string): string {
  const [year, month] = mes.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

function formatDia(key: string, periodo: Periodo): string {
  const [, , day] = key.split("-");
  if (periodo === "semana") {
    const [year, month, d] = key.split("-");
    return new Date(Number(year), Number(month) - 1, Number(d))
      .toLocaleDateString("es-AR", { weekday: "short" });
  }
  // mes o personalizado: solo el número del día
  return String(Number(day));
}

function buildChartData(
  raw: { mes: string; cantidad: number }[],
  periodo: Periodo,
  range: { desde: string; hasta: string } | null | undefined
): { key: string; label: string; cantidad: number }[] {
  const map = new Map(raw.map((d) => [d.mes, d.cantidad]));

  if (periodo === "año") {
    const year = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      // solo el número del mes
      return { key, label: String(i + 1), cantidad: map.get(key) ?? 0 };
    });
  }

  // semana, mes, personalizado → por día
  const desde = range?.desde ?? new Date().toISOString().split("T")[0];
  const hasta = range?.hasta ?? desde;
  const result: { key: string; label: string; cantidad: number }[] = [];
  const cursor = new Date(desde + "T00:00:00");
  const end = new Date(hasta + "T00:00:00");
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    result.push({ key, label: formatDia(key, periodo), cantidad: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

const chartTitleMap: Record<Periodo, string> = {
  semana: "Turnos por semana",
  mes: "Turnos por mes",
  año: "Turnos por año",
  personalizado: "Turnos por período",
};

export function ClienteMetricas({ data, loading, periodo = "mes", range }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  const isEmpty = !data || (
    data.turnosPorMes.length === 0 &&
    data.edadPromedio === null &&
    data.distribucionSexos.length === 0 &&
    data.distribucionTiposTurno.length === 0
  );

  const chartTitle = chartTitleMap[periodo];
  const chartData = isEmpty ? [] : buildChartData(data.turnosPorMes, periodo, range);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Turnos por período */}
      <MetricCard title={chartTitle}>
        {isEmpty ? (
          <EmptyBlock />
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 18 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                interval={periodo === "mes" ? 4 : 0}
                label={{
                  value: periodo === "año" ? "Mes" : periodo === "semana" ? "Día" : "Día",
                  position: "insideBottom",
                  offset: -10,
                  fontSize: 10,
                  fill: "#6b7280",
                }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Turnos",
                  angle: -90,
                  position: "insideLeft",
                  offset: 16,
                  fontSize: 10,
                  fill: "#6b7280",
                }}
              />
              <Tooltip
                formatter={(v) => [v ?? 0, "Turnos"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #E0E0DB",
                }}
              />
              <Bar dataKey="cantidad" fill="var(--brand-color)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </MetricCard>

      {/* Edad promedio */}
      <MetricCard title="Edad promedio">
        {isEmpty || data.edadPromedio === null ? (
          <EmptyBlock />
        ) : (
          <div className="flex items-baseline gap-1 pt-1">
            <span className="font-heading text-4xl text-[var(--brand-color)]">
              {data.edadPromedio}
            </span>
            <span className="text-sm text-[#6b7280] dark:text-[#94a3b8]">años</span>
          </div>
        )}
      </MetricCard>

      {/* Distribución de sexos */}
      <MetricCard title="Distribución por sexo">
        {isEmpty || data.distribucionSexos.length === 0 ? (
          <EmptyBlock />
        ) : (
          <div className="flex items-center gap-3 h-32">
            <ResponsiveContainer width="60%" height={120}>
              <PieChart>
                <Pie
                  data={data.distribucionSexos}
                  dataKey="cantidad"
                  nameKey="sexo"
                  cx="50%"
                  cy="50%"
                  outerRadius={50}
                  strokeWidth={0}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {data.distribucionSexos.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [v, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E0E0DB" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1 text-xs">
              {data.distribucionSexos.map((item, i) => (
                <span key={item.sexo} className="flex items-center gap-1 text-[#2A2829] dark:text-[#cbd5e1]">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {item.sexo} ({item.cantidad})
                </span>
              ))}
            </div>
          </div>
        )}
      </MetricCard>

      {/* Distribución por tipo de turno */}
      <MetricCard title="Tipos de turno">
        {isEmpty || data.distribucionTiposTurno.length === 0 ? (
          <EmptyBlock />
        ) : (
          <div className="flex items-center gap-3 h-32">
            <ResponsiveContainer width="60%" height={120}>
              <PieChart>
                <Pie
                  data={data.distribucionTiposTurno}
                  dataKey="cantidad"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={50}
                  strokeWidth={0}
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {data.distribucionTiposTurno.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [v, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E0E0DB" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1 text-xs">
              {data.distribucionTiposTurno.map((item, i) => (
                <span key={item.tipo} className="flex items-center gap-1 text-[#2A2829] dark:text-[#cbd5e1]">
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {item.tipo}
                </span>
              ))}
            </div>
          </div>
        )}
      </MetricCard>
    </div>
  );
}
