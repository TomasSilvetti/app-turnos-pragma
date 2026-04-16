"use client";

import { Suspense } from "react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ClienteMetricas, MetricasData } from "@/components/clientes/ClienteMetricas";
import { ClienteListado } from "@/components/clientes/ClienteListado";
import { ClienteResumen } from "@/components/clientes/ClienteCard";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DatePickerInput } from "@/components/ui/DatePickerInput";

// Datos mock usados únicamente durante el paso de tutorial de clientes
function buildMockMetricas(): MetricasData {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  return {
    turnosPorMes: [
      { mes: `${y}-${m}-05`, cantidad: 2 },
      { mes: `${y}-${m}-10`, cantidad: 4 },
      { mes: `${y}-${m}-15`, cantidad: 3 },
      { mes: `${y}-${m}-20`, cantidad: 5 },
      { mes: `${y}-${m}-25`, cantidad: 1 },
    ],
    edadPromedio: 34,
    distribucionSexos: [
      { sexo: "Masculino", cantidad: 6 },
      { sexo: "Femenino", cantidad: 9 },
    ],
    distribucionTiposTurno: [
      { tipo: "Corte de cabello", cantidad: 8 },
      { tipo: "Barba", cantidad: 4 },
      { tipo: "Color", cantidad: 3 },
    ],
    turnosPorEmpleado: [
      { nombre: "Martín G.", cantidad: 8 },
      { nombre: "Sofía R.", cantidad: 7 },
    ],
    ingresosPorEmpleado: [
      { nombre: "Martín G.", ingreso: 24000 },
      { nombre: "Sofía R.", ingreso: 19500 },
    ],
  };
}

type Periodo = "semana" | "mes" | "año" | "personalizado";

function getDateRange(periodo: Periodo): { desde: string; hasta: string } | null {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const fmt = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  if (periodo === "semana") {
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const desde = new Date(today);
    desde.setDate(today.getDate() + diff);
    const hasta = new Date(desde);
    hasta.setDate(desde.getDate() + 6);
    return { desde: fmt(desde), hasta: fmt(hasta) };
  }
  if (periodo === "mes") {
    const desde = new Date(y, m, 1);
    const hasta = new Date(y, m + 1, 0);
    return { desde: fmt(desde), hasta: fmt(hasta) };
  }
  if (periodo === "año") {
    const desde = new Date(y, 0, 1);
    const hasta = new Date(y, 11, 31);
    return { desde: fmt(desde), hasta: fmt(hasta) };
  }
  return null;
}

function ClientesContent() {
  const searchParams = useSearchParams();
  const isTutorial = searchParams.get("fromTutorial") !== null;

  const [metricas, setMetricas] = useState<MetricasData | null>(
    isTutorial ? buildMockMetricas() : null
  );
  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [loadingMetricas, setLoadingMetricas] = useState(!isTutorial);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const fetchMetricas = useCallback(() => {
    if (isTutorial) return;
    setLoadingMetricas(true);

    let range: { desde: string; hasta: string } | null = null;
    if (periodo === "personalizado") {
      if (desde && hasta) range = { desde, hasta };
    } else {
      range = getDateRange(periodo);
    }

    const granularidad = periodo === "año" ? "mes" : "dia";
    const params = range
      ? `?desde=${range.desde}&hasta=${range.hasta}&granularidad=${granularidad}`
      : `?granularidad=${granularidad}`;

    fetch(`/api/clientes/metricas${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMetricas(data))
      .catch(() => {})
      .finally(() => setLoadingMetricas(false));
  }, [periodo, desde, hasta, isTutorial]);

  useEffect(() => {
    if (!isTutorial && periodo !== "personalizado") {
      fetchMetricas();
    }
  }, [periodo, fetchMetricas, isTutorial]);

  useEffect(() => {
    if (isTutorial) {
      setLoadingClientes(false);
      return;
    }
    fetch("/api/clientes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingClientes(false));
  }, []);

  const labelMap: Record<Periodo, string> = {
    semana: "Esta semana",
    mes: "Este mes",
    año: "Este año",
    personalizado: "Período personalizado",
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-[#2A2829] dark:text-[#e2e8f0]">Clientes</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Métricas y seguimiento de tu clientela.
        </p>
      </div>

      {/* Filtro de período */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8]">
            Período
          </label>
          <CustomSelect
            value={periodo}
            onChange={(val) => setPeriodo(val as Periodo)}
            options={(["semana", "mes", "año", "personalizado"] as Periodo[]).map((p) => ({
              value: p,
              label: labelMap[p],
            }))}
            className="w-44"
          />
        </div>

        {periodo === "personalizado" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8]">
                Desde
              </label>
              <DatePickerInput value={desde} onChange={setDesde} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-widest text-[#6b7280] dark:text-[#94a3b8]">
                Hasta
              </label>
              <DatePickerInput value={hasta} onChange={setHasta} />
            </div>
            <button
              onClick={fetchMetricas}
              disabled={!desde || !hasta}
              className="rounded-md bg-[var(--brand-color)] text-white text-sm px-4 py-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              Aplicar
            </button>
          </>
        )}
      </div>

      <ClienteMetricas
        data={metricas}
        loading={loadingMetricas}
        periodo={periodo}
        range={periodo === "personalizado" && desde && hasta ? { desde, hasta } : getDateRange(periodo)}
      />

      <div className="mt-8">
        <h2 className="font-heading text-base text-[#2A2829] dark:text-[#e2e8f0] mb-4">
          Listado de clientes
        </h2>
        <ClienteListado clientes={clientes} loading={loadingClientes} />
      </div>
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense>
      <ClientesContent />
    </Suspense>
  );
}
