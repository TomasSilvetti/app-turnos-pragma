"use client";

import { useState } from "react";
import { ScheduleConfigList, type ScheduleConfig } from "@/components/schedule-config/ScheduleConfigList";
import { ScheduleConfigModal, type ScheduleConfigFormData, type ServiceType } from "@/components/schedule-config/ScheduleConfigModal";
import { ScheduleConfigCalendar } from "@/components/schedule-config/ScheduleConfigCalendar";

// --- Mock data ---
const mockServiceTypes: ServiceType[] = [
  { id: "1", titulo: "Consulta general" },
  { id: "2", titulo: "Control de seguimiento" },
  { id: "3", titulo: "Primera vez" },
];

const mockConfigs: ScheduleConfig[] = [
  {
    id: "1",
    nombre: "Lunes a viernes mañana",
    startTime: "09:00",
    endTime: "13:00",
    intervalMinutes: 30,
    daysOfWeek: ["L", "M", "X", "J", "V"],
    isActive: true,
  },
  {
    id: "2",
    nombre: "Sábados",
    startTime: "10:00",
    endTime: "14:00",
    intervalMinutes: 45,
    daysOfWeek: ["S"],
    isActive: false,
  },
];

export default function HorariosPage() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>(mockConfigs);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<(ScheduleConfig & { serviceTypeIds?: string[] }) | undefined>();

  function handleAdd() {
    setEditingConfig(undefined);
    setModalOpen(true);
  }

  function handleEdit(config: ScheduleConfig) {
    setEditingConfig({ ...config, serviceTypeIds: [] });
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

  function handleSubmit(data: ScheduleConfigFormData) {
    if (editingConfig) {
      setConfigs((prev) =>
        prev.map((c) =>
          c.id === editingConfig.id ? { ...c, ...data } : c
        )
      );
    } else {
      const newConfig: ScheduleConfig = {
        id: Date.now().toString(),
        isActive: true,
        ...data,
      };
      setConfigs((prev) => [...prev, newConfig]);
    }
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
        onDaySelect={(date) => console.log("Día seleccionado:", date)}
      />
      </div>

      <ScheduleConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingConfig}
        serviceTypes={mockServiceTypes}
      />
    </div>
  );
}
