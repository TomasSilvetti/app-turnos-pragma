"use client";

import { useState } from "react";
import { ScheduleConfigList, type ScheduleConfig } from "@/components/schedule-config/ScheduleConfigList";
import { ScheduleConfigModal, type ScheduleConfigFormData, type ServiceType } from "@/components/schedule-config/ScheduleConfigModal";
import { ScheduleConfigCalendar } from "@/components/schedule-config/ScheduleConfigCalendar";
import { ScheduleConfigSlots } from "@/components/schedule-config/ScheduleConfigSlots";

const mockServiceTypes: ServiceType[] = [
  { id: "1", titulo: "Consulta general" },
  { id: "2", titulo: "Control de seguimiento" },
  { id: "3", titulo: "Primera vez" },
];

const mockConfigs: ScheduleConfig[] = [];

function getConflictingDays(configs: ScheduleConfig[], targetId: string, targetDays: string[]): string[] {
  const DIAS_LABEL: Record<string, string> = {
    L: "Lunes", M: "Martes", X: "Miércoles", J: "Jueves", V: "Viernes", S: "Sábado", D: "Domingo",
  };
  const activeDays = new Set<string>();
  for (const c of configs) {
    if (c.id !== targetId && c.isActive) {
      for (const d of c.daysOfWeek) activeDays.add(d);
    }
  }
  return targetDays.filter((d) => activeDays.has(d)).map((d) => DIAS_LABEL[d] ?? d);
}

export default function ConfiguracionTurnosPage() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>(mockConfigs);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

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
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    setToggleError(null);
  }

  function handleToggle(id: string) {
    const config = configs.find((c) => c.id === id);
    if (!config) return;

    // Si se está desactivando, siempre permitir
    if (config.isActive) {
      setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: false } : c)));
      setToggleError(null);
      return;
    }

    // Si se está activando, validar conflictos
    const conflicting = getConflictingDays(configs, id, config.daysOfWeek);
    if (conflicting.length > 0) {
      setToggleError(
        `No se puede activar "${config.nombre}" porque comparte días con otra configuración activa: ${conflicting.join(", ")}.`
      );
      return;
    }

    setToggleError(null);
    setConfigs((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: true } : c)));
  }

  function handleSubmit(data: ScheduleConfigFormData): boolean | void {
    setToggleError(null);
    if (editingConfig) {
      setModalError(null);
      setConfigs((prev) =>
        prev.map((c) => (c.id === editingConfig.id ? { ...c, ...data } : c))
      );
    } else {
      const conflicting = getConflictingDays(configs, "", data.daysOfWeek);
      if (conflicting.length > 0) {
        setModalError(
          `Estos días ya están en una configuración activa: ${conflicting.join(", ")}.`
        );
        return false;
      }
      setModalError(null);
      const nueva: ScheduleConfig = {
        id: crypto.randomUUID(),
        isActive: true,
        nombre: data.nombre,
        startTime: data.startTime,
        endTime: data.endTime,
        intervalMinutes: data.intervalMinutes,
        daysOfWeek: data.daysOfWeek,
      };
      setConfigs((prev) => [...prev, nueva]);
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

      <ScheduleConfigModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalError(null); }}
        onSubmit={handleSubmit}
        initialData={editingConfig ?? undefined}
        serviceTypes={mockServiceTypes}
        error={modalError ?? undefined}
      />
    </div>
  );
}
