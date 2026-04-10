"use client";

import { useEffect, useState } from "react";
import { ScheduleConfigList, type ScheduleConfig } from "@/components/schedule-config/ScheduleConfigList";
import { ScheduleConfigModal, type ScheduleConfigFormData, type ServiceType } from "@/components/schedule-config/ScheduleConfigModal";
import { ScheduleConfigCalendar } from "@/components/schedule-config/ScheduleConfigCalendar";
import { ScheduleConfigSlots } from "@/components/schedule-config/ScheduleConfigSlots";
import { DeleteScheduleConfigDialog } from "@/components/schedule-config/DeleteScheduleConfigDialog";

const DIAS_LABEL: Record<string, string> = {
  L: "Lunes", M: "Martes", X: "Miércoles", J: "Jueves", V: "Viernes", S: "Sábado", D: "Domingo",
};

type ApiScheduleConfig = {
  id: string;
  name: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  daysOfWeek: string[];
  serviceTypes: { id: string; title: string }[];
};

function mapFromApi(c: ApiScheduleConfig): ScheduleConfig {
  return {
    id: c.id,
    nombre: c.name,
    isActive: c.isActive,
    startTime: c.startTime,
    endTime: c.endTime,
    intervalMinutes: c.intervalMinutes,
    daysOfWeek: c.daysOfWeek,
  };
}

function getConflictingDays(configs: ScheduleConfig[], targetId: string, targetDays: string[]): string[] {
  const activeDays = new Set<string>();
  for (const c of configs) {
    if (c.id !== targetId && c.isActive) {
      for (const d of c.daysOfWeek) activeDays.add(d);
    }
  }
  return targetDays.filter((d) => activeDays.has(d)).map((d) => DIAS_LABEL[d] ?? d);
}

export default function ConfiguracionTurnosPage() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig & { serviceTypeIds?: string[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/schedule-configs").then((r) => r.json()),
      fetch("/api/service-types").then((r) => r.json()),
    ]).then(([configsData, typesData]) => {
      if (Array.isArray(configsData)) {
        setConfigs((configsData as ApiScheduleConfig[]).map(mapFromApi));
      }
      if (Array.isArray(typesData)) {
        setServiceTypes(typesData.map((t: { id: string; title: string }) => ({ id: t.id, titulo: t.title })));
      }
    }).finally(() => setLoading(false));
  }, []);

  function handleAdd() {
    setEditingConfig(null);
    setModalError(null);
    setModalOpen(true);
  }

  function handleEdit(config: ScheduleConfig) {
    setEditingConfig(config);
    setModalError(null);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    setDeletingId(id);
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    const res = await fetch(`/api/schedule-configs/${deletingId}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) return;
    setConfigs((prev) => prev.filter((c) => c.id !== deletingId));
    setDeletingId(null);
    setToggleError(null);
  }

  async function handleToggle(id: string) {
    setToggleError(null);
    const res = await fetch(`/api/schedule-configs/${id}/toggle`, { method: "PATCH" });

    if (res.status === 409) {
      const json = await res.json();
      const days: string[] = (json.conflictingDays ?? []).map((d: string) => DIAS_LABEL[d] ?? d);
      const config = configs.find((c) => c.id === id);
      setToggleError(
        `No se puede activar "${config?.nombre}" porque comparte días con otra configuración activa: ${days.join(", ")}.`
      );
      return;
    }

    if (!res.ok) return;

    const updated: ApiScheduleConfig = await res.json();
    setConfigs((prev) => prev.map((c) => (c.id === id ? mapFromApi(updated) : c)));
  }

  async function handleSubmit(data: ScheduleConfigFormData): Promise<boolean | void> {
    setToggleError(null);

    if (editingConfig) {
      const res = await fetch(`/api/schedule-configs/${editingConfig.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.nombre,
          startTime: data.startTime,
          endTime: data.endTime,
          intervalMinutes: data.intervalMinutes,
          daysOfWeek: data.daysOfWeek,
          serviceTypeIds: data.serviceTypeIds,
          price: 0,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setModalError(json.error ?? "Error al actualizar la configuración.");
        return false;
      }

      const updated: ApiScheduleConfig = await res.json();
      setModalError(null);
      setConfigs((prev) => prev.map((c) => (c.id === editingConfig.id ? mapFromApi(updated) : c)));
    } else {
      const conflicting = getConflictingDays(configs, "", data.daysOfWeek);
      if (conflicting.length > 0) {
        setModalError(`Estos días ya están en una configuración activa: ${conflicting.join(", ")}.`);
        return false;
      }

      const res = await fetch("/api/schedule-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.nombre,
          startTime: data.startTime,
          endTime: data.endTime,
          intervalMinutes: data.intervalMinutes,
          daysOfWeek: data.daysOfWeek,
          serviceTypeIds: data.serviceTypeIds,
          price: 0,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        setModalError(json.error ?? "Error al crear la configuración.");
        return false;
      }

      const created: ApiScheduleConfig = await res.json();
      setModalError(null);
      setConfigs((prev) => [...prev, mapFromApi(created)]);
    }
  }

  const hasActiveConfigs = configs.some((c) => c.isActive);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[#253551]">Configuración de turnos</h1>
        <p className="mt-0.5 text-sm text-[#2A2829]/60">
          Definí tu disponibilidad semanal para la generación de turnos.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-[#E0E0DB] bg-white animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <ScheduleConfigList
            configs={configs}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />

          {toggleError && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {toggleError}
            </div>
          )}

          {hasActiveConfigs && (
            <div className="mt-6 space-y-3">
              <h2 className="font-heading text-base text-[#253551]">Vista previa de turnos</h2>
              <ScheduleConfigCalendar configs={configs} onDaySelect={setSelectedDay} />
              <ScheduleConfigSlots configs={configs} selectedDay={selectedDay} />
            </div>
          )}
        </>
      )}

      {deletingId && (
        <DeleteScheduleConfigDialog
          configId={deletingId}
          configName={configs.find((c) => c.id === deletingId)?.nombre ?? ""}
          onConfirm={confirmDelete}
          onCancel={() => setDeletingId(null)}
          isDeleting={isDeleting}
        />
      )}

      <ScheduleConfigModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalError(null); }}
        onSubmit={handleSubmit}
        initialData={editingConfig ?? undefined}
        serviceTypes={serviceTypes}
        error={modalError ?? undefined}
      />
    </div>
  );
}
