"use client";

import { useState, useEffect } from "react";
import { ScheduleConfigList, type ScheduleConfig } from "@/components/schedule-config/ScheduleConfigList";
import { ScheduleConfigModal, type ScheduleConfigFormData, type ServiceType } from "@/components/schedule-config/ScheduleConfigModal";
import { ScheduleConfigCalendar } from "@/components/schedule-config/ScheduleConfigCalendar";
import { ScheduleConfigSlots } from "@/components/schedule-config/ScheduleConfigSlots";

type ConfigWithServiceTypes = ScheduleConfig & { serviceTypeIds: string[] };

function mapApiConfig(c: {
  id: string;
  name: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  daysOfWeek: string[];
  serviceTypes: { id: string; title: string }[];
}): ConfigWithServiceTypes {
  return {
    id: c.id,
    nombre: c.name,
    isActive: c.isActive,
    startTime: c.startTime,
    endTime: c.endTime,
    intervalMinutes: c.intervalMinutes,
    daysOfWeek: c.daysOfWeek,
    serviceTypeIds: c.serviceTypes.map((t) => t.id),
  };
}

export default function HorariosPage() {
  const [configs, setConfigs] = useState<ConfigWithServiceTypes[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<(ScheduleConfig & { serviceTypeIds?: string[] }) | undefined>();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [modalError, setModalError] = useState<string | undefined>();

  useEffect(() => {
    async function load() {
      const [configsRes, serviceTypesRes] = await Promise.all([
        fetch("/api/schedule-configs"),
        fetch("/api/service-types"),
      ]);

      if (configsRes.ok) {
        const data = await configsRes.json();
        setConfigs(data.map(mapApiConfig));
      }

      if (serviceTypesRes.ok) {
        const data: { id: string; title: string }[] = await serviceTypesRes.json();
        setServiceTypes(data.map((t) => ({ id: t.id, titulo: t.title })));
      }

      setLoading(false);
    }
    load();
  }, []);

  function handleAdd() {
    setEditingConfig(undefined);
    setModalError(undefined);
    setModalOpen(true);
  }

  function handleEdit(config: ScheduleConfig) {
    const full = configs.find((c) => c.id === config.id);
    setEditingConfig({ ...config, serviceTypeIds: full?.serviceTypeIds ?? [] });
    setModalError(undefined);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
  }

  function handleToggle(id: string) {
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  }

  async function handleSubmit(data: ScheduleConfigFormData) {
    setModalError(undefined);

    const url = editingConfig
      ? `/api/schedule-configs/${editingConfig.id}`
      : "/api/schedule-configs";
    const method = editingConfig ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.nombre,
        startTime: data.startTime,
        endTime: data.endTime,
        intervalMinutes: data.intervalMinutes,
        daysOfWeek: data.daysOfWeek,
        serviceTypeIds: data.serviceTypeIds,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 404 && body?.error?.includes("perfil")) {
        setModalError("Tenés que completar tu perfil de negocio antes de crear una configuración de horarios.");
      } else {
        setModalError(body?.error ?? "Ocurrió un error al guardar. Intentá de nuevo.");
      }
      return false;
    }

    const saved = await res.json();
    const mapped = mapApiConfig(saved);

    if (editingConfig) {
      setConfigs((prev) => prev.map((c) => (c.id === editingConfig.id ? mapped : c)));
    } else {
      setConfigs((prev) => [...prev, mapped]);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl text-[#253551]">Configuración de horarios</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60">
            Definí tus bloques de disponibilidad semanal para la generación de turnos.
          </p>
        </div>
        <div className="flex items-center justify-center py-16 text-sm text-[#2A2829]/40">
          Cargando...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[#253551]">Configuración de horarios</h1>
        <p className="mt-0.5 text-sm text-[#2A2829]/60">
          Definí tus bloques de disponibilidad semanal para la generación de turnos.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <ScheduleConfigList
          configs={configs}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onAdd={handleAdd}
        />

        <ScheduleConfigCalendar
          configs={configs}
          onDaySelect={(date) => setSelectedDay(date)}
        />

        <ScheduleConfigSlots
          configs={configs}
          selectedDay={selectedDay}
        />
      </div>

      <ScheduleConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingConfig}
        serviceTypes={serviceTypes}
        error={modalError}
      />
    </div>
  );
}
