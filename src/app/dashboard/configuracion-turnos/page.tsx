"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScheduleConfigList, type ScheduleConfig } from "@/components/schedule-config/ScheduleConfigList";
import { ScheduleConfigModal, type ScheduleConfigFormData, type ServiceType } from "@/components/schedule-config/ScheduleConfigModal";
import { ScheduleConfigCalendar } from "@/components/schedule-config/ScheduleConfigCalendar";
import { ScheduleConfigSlots } from "@/components/schedule-config/ScheduleConfigSlots";
import { DeleteScheduleConfigDialog } from "@/components/schedule-config/DeleteScheduleConfigDialog";
import { EditConflictDialog, type ConflictingBooking } from "@/components/schedule-config/EditConflictDialog";
import { RescheduleNoticeDialog } from "@/components/schedule-config/RescheduleNoticeDialog";
import { ModoTurnoToggle } from "@/components/schedule-config/ModoTurnoToggle";

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

function parseMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getConflictingDays(
  configs: ScheduleConfig[],
  targetId: string,
  targetDays: string[],
  targetStartTime?: string,
  targetEndTime?: string,
): string[] {
  const conflictingDays = new Set<string>();
  const targetDaysSet = new Set(targetDays);
  const newStart = targetStartTime ? parseMinutes(targetStartTime) : null;
  const newEnd = targetEndTime ? parseMinutes(targetEndTime) : null;

  for (const c of configs) {
    if (c.id === targetId || !c.isActive) continue;
    const sharedDays = c.daysOfWeek.filter((d) => targetDaysSet.has(d));
    if (sharedDays.length === 0) continue;

    if (newStart !== null && newEnd !== null) {
      const cfgStart = parseMinutes(c.startTime);
      const cfgEnd = parseMinutes(c.endTime);
      if (!(newStart < cfgEnd && cfgStart < newEnd)) continue;
    }

    for (const d of sharedDays) conflictingDays.add(d);
  }

  return [...conflictingDays].map((d) => DIAS_LABEL[d] ?? d);
}

type PendingSubmitData = {
  configId: string;
  formData: ScheduleConfigFormData;
};

export default function ConfiguracionTurnosPage() {
  const [configs, setConfigs] = useState<ScheduleConfig[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [modoTurno, setModoTurno] = useState<"FIJO" | "POR_TIPO">("FIJO");
  const [modoTurnoLoading, setModoTurnoLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hasSucursal, setHasSucursal] = useState<boolean | null>(null);
  const [userRol, setUserRol] = useState<string>("propietario");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ScheduleConfig & { serviceTypeIds?: string[] } | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editConflicting, setEditConflicting] = useState<ConflictingBooking[] | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<PendingSubmitData | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showRescheduleNotice, setShowRescheduleNotice] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/schedule-configs").then((r) => r.json()),
      fetch("/api/service-types").then((r) => r.json()),
      fetch("/api/service-providers/me/modo-turno").then((r) => r.json()),
    ]).then(([configsData, typesData, modoData]) => {
      if (Array.isArray(configsData)) {
        setConfigs((configsData as ApiScheduleConfig[]).map(mapFromApi));
      }
      if (Array.isArray(typesData)) {
        setServiceTypes(
          typesData.map((t: { id: string; title: string; price: number; duracion?: number | null }) => ({
            id: t.id,
            titulo: t.title,
            precio: t.price,
            duracion: t.duracion ?? null,
          }))
        );
      }
      if (modoData?.modoTurno) {
        setModoTurno(modoData.modoTurno);
      }
    }).finally(() => {
      setLoading(false);
      setModoTurnoLoading(false);
    });

    fetch("/api/me/sucursal")
      .then((r) => r.json())
      .then(async (data) => {
        if (data && typeof data.hasSucursal === "boolean") {
          setHasSucursal(data.hasSucursal);
          setUserRol(data.rol ?? "propietario");

          if (!data.hasSucursal) {
            setConfigs((prev) => {
              const activas = prev.filter((c) => c.isActive);
              if (activas.length > 0) {
                Promise.all(
                  activas.map((c) =>
                    fetch(`/api/schedule-configs/${c.id}/toggle`, { method: "PATCH" })
                  )
                );
              }
              return prev.map((c) => ({ ...c, isActive: false }));
            });
          }
        } else {
          setHasSucursal(true);
        }
      })
      .catch(() => setHasSucursal(true));
  }, []);

  async function handleModoTurnoChange(activado: boolean) {
    const nuevoModo = activado ? "POR_TIPO" : "FIJO";
    setModoTurno(nuevoModo);

    await fetch("/api/service-providers/me/modo-turno", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modoTurno: nuevoModo }),
    });

    if (nuevoModo === "POR_TIPO") {
      const activeConfigs = configs.filter((c) => c.isActive);
      await Promise.all(
        activeConfigs.map((c) =>
          fetch(`/api/schedule-configs/${c.id}/toggle`, { method: "PATCH" })
        )
      );
      setConfigs((prev) => prev.map((c) => ({ ...c, isActive: false })));
    }
  }

  function handleAdd() {
    if (hasSucursal === false) return;
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

  async function confirmDelete(keepBookings: boolean) {
    if (!deletingId) return;
    setIsDeleting(true);
    const url = keepBookings
      ? `/api/schedule-configs/${deletingId}?keepBookings=true`
      : `/api/schedule-configs/${deletingId}`;
    const res = await fetch(url, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) return;
    setConfigs((prev) => prev.filter((c) => c.id !== deletingId));
    setDeletingId(null);
    setToggleError(null);
    if (!keepBookings) {
      setShowRescheduleNotice(true);
    }
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

  async function performSave(configId: string, data: ScheduleConfigFormData, markForReschedule: boolean): Promise<boolean> {
    const res = await fetch(`/api/schedule-configs/${configId}`, {
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
        markForReschedule,
      }),
    });

    if (!res.ok) {
      const json = await res.json();
      setModalError(json.error ?? "Error al actualizar la configuración.");
      return false;
    }

    const updated: ApiScheduleConfig = await res.json();
    setModalError(null);
    setConfigs((prev) => prev.map((c) => (c.id === configId ? mapFromApi(updated) : c)));
    return true;
  }

  async function handleSubmit(data: ScheduleConfigFormData): Promise<boolean | void> {
    setToggleError(null);

    if (editingConfig) {
      const checkRes = await fetch(`/api/schedule-configs/${editingConfig.id}/edit-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          daysOfWeek: data.daysOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
        }),
      });

      if (checkRes.ok) {
        const { conflicting }: { conflicting: ConflictingBooking[] } = await checkRes.json();
        if (conflicting.length > 0) {
          setPendingSubmit({ configId: editingConfig.id, formData: data });
          setEditConflicting(conflicting);
          return false;
        }
      }

      const ok = await performSave(editingConfig.id, data, false);
      return ok ? undefined : false;
    } else {
      const conflicting = getConflictingDays(configs, "", data.daysOfWeek, data.startTime, data.endTime);
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

  async function handleEditKeep() {
    if (!pendingSubmit) return;
    setIsSavingEdit(true);
    const ok = await performSave(pendingSubmit.configId, pendingSubmit.formData, false);
    setIsSavingEdit(false);
    if (ok) {
      setEditConflicting(null);
      setPendingSubmit(null);
      setModalOpen(false);
    }
  }

  async function handleEditReschedule() {
    if (!pendingSubmit) return;
    setIsSavingEdit(true);
    const ok = await performSave(pendingSubmit.configId, pendingSubmit.formData, true);
    setIsSavingEdit(false);
    if (ok) {
      setEditConflicting(null);
      setPendingSubmit(null);
      setModalOpen(false);
      setShowRescheduleNotice(true);
    }
  }

  function handleEditConflictCancel() {
    setEditConflicting(null);
    setPendingSubmit(null);
  }

  const hasActiveConfigs = configs.some((c) => c.isActive);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Configuración de turnos</h1>
        <p className="mt-0.5 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
          Definí tu disponibilidad semanal para la generación de turnos.
        </p>
      </div>

      {hasSucursal === false && (
        <div className="mb-5 rounded-md border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
          {(userRol === "administrador" || userRol === "propietario") ? (
            <>
              No podés crear configuraciones de horario porque no tenés una sucursal asignada. Asignate una sucursal desde el módulo de{" "}
              <Link href="/dashboard/empleados" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-300">
                Empleados
              </Link>
              .
            </>
          ) : (
            "No podés crear configuraciones de horario porque no tenés una sucursal asignada. Contactá al administrador para que te asigne una."
          )}
        </div>
      )}

      {/* Toggle de modo de duración */}
      <div className="mb-5">
        <ModoTurnoToggle
          value={modoTurno === "POR_TIPO"}
          onChange={handleModoTurnoChange}
          disabled={modoTurnoLoading}
        />
      </div>


      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-[#E0E0DB] dark:border-[#1a2840] bg-white dark:bg-[#0c1220] animate-pulse" />
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
            isToggleDisabled={(config) => hasSucursal === false || (modoTurno === "POR_TIPO" && config.intervalMinutes > 0)}
            isAddDisabled={hasSucursal === false}
          />

          {toggleError && (
            <div className="mt-3 rounded-md border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-400">
              {toggleError}
            </div>
          )}

          {hasActiveConfigs && (
            <div className="mt-6 space-y-3">
              <h2 className="font-heading text-base text-[var(--brand-color)] dark:text-[#93c5fd]">Vista previa de turnos</h2>
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
          onConfirmKeep={() => confirmDelete(true)}
          onConfirmReschedule={() => confirmDelete(false)}
          onCancel={() => setDeletingId(null)}
          isDeleting={isDeleting}
        />
      )}

      {editConflicting && (
        <EditConflictDialog
          conflicting={editConflicting}
          onKeep={handleEditKeep}
          onReschedule={handleEditReschedule}
          onCancel={handleEditConflictCancel}
          isSaving={isSavingEdit}
        />
      )}

      {showRescheduleNotice && (
        <RescheduleNoticeDialog onClose={() => setShowRescheduleNotice(false)} />
      )}

      <ScheduleConfigModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalError(null); }}
        onSubmit={handleSubmit}
        initialData={editingConfig ?? undefined}
        serviceTypes={serviceTypes}
        modoTurno={modoTurno}
        onServiceTypesChange={setServiceTypes}
        error={modalError ?? undefined}
      />
    </div>
  );
}
