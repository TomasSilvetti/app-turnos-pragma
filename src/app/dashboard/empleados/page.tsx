"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmpleadoList } from "@/components/empleados/EmpleadoList";
import { EmpleadoForm } from "@/components/empleados/EmpleadoForm";
import { EditEmpleadoModal } from "@/components/empleados/EditEmpleadoModal";
import { DeleteEmpleadoDialog } from "@/components/empleados/DeleteEmpleadoDialog";
import type { Empleado, EmpleadoFormValues, EditEmpleadoValues, SucursalRef } from "@/components/empleados/types";

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [sucursales, setSucursales] = useState<SucursalRef[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | undefined>(undefined);
  const [editError, setEditError] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  const [deletingEmpleado, setDeletingEmpleado] = useState<Empleado | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/empleados").then((r) => r.json()),
      fetch("/api/sucursales").then((r) => r.json()),
    ])
      .then(([emp, suc]) => {
        setEmpleados(Array.isArray(emp) ? emp : []);
        setSucursales(Array.isArray(suc) ? suc.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleAdd() {
    setFormError(undefined);
    setFormOpen(true);
  }

  async function handleCreate(data: EmpleadoFormValues) {
    setIsSaving(true);
    setFormError(undefined);

    const res = await fetch("/api/empleados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const created = await res.json();
      setEmpleados((prev) => [...prev, created]);
      setFormOpen(false);
    } else {
      const err = await res.json();
      setFormError(err.error ?? "No se pudo crear el empleado.");
    }

    setIsSaving(false);
  }

  function handleEditRequest(empleado: Empleado) {
    setEditingEmpleado(empleado);
    setEditError(undefined);
  }

  async function handleEdit(data: EditEmpleadoValues) {
    if (!editingEmpleado) return;
    setIsEditing(true);
    setEditError(undefined);

    const res = await fetch(`/api/empleados/${editingEmpleado.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      setEmpleados((prev) =>
        prev.map((e) => (e.id === editingEmpleado.id ? { ...e, ...updated } : e))
      );
      setEditingEmpleado(undefined);
    } else {
      const err = await res.json();
      setEditError(err.error ?? "No se pudo actualizar el empleado.");
    }

    setIsEditing(false);
  }

  function handleDeleteRequest(empleado: Empleado) {
    setDeletingEmpleado(empleado);
    setDeleteError(undefined);
  }

  async function handleDeleteConfirm() {
    if (!deletingEmpleado) return;
    setIsDeleting(true);
    setDeleteError(undefined);

    const res = await fetch(`/api/empleados/${deletingEmpleado.id}`, { method: "DELETE" });

    if (res.ok) {
      setEmpleados((prev) => prev.filter((e) => e.id !== deletingEmpleado.id));
      setDeletingEmpleado(undefined);
    } else {
      const data = await res.json();
      setDeleteError(data.error ?? "No se pudo desactivar el empleado.");
    }

    setIsDeleting(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Empleados</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Administrá el equipo de tu empresa.
          </p>
        </div>
        <p className="text-sm text-[#2A2829]/60 dark:text-[#64748b]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Empleados</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Administrá el equipo de tu empresa.
          </p>
        </div>
        {empleados.length > 0 && (
          <Button
            onClick={handleAdd}
            className="bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] sm:shrink-0"
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo empleado
          </Button>
        )}
      </div>

      <EmpleadoList
        empleados={empleados}
        onEdit={handleEditRequest}
        onDelete={handleDeleteRequest}
        onAdd={handleAdd}
      />

      {formOpen && (
        <EmpleadoForm
          sucursales={sucursales}
          isSaving={isSaving}
          error={formError}
          onSave={handleCreate}
          onCancel={() => { setFormOpen(false); setFormError(undefined); }}
        />
      )}

      {editingEmpleado && (
        <EditEmpleadoModal
          empleado={editingEmpleado}
          sucursales={sucursales}
          isSaving={isEditing}
          error={editError}
          onSave={handleEdit}
          onCancel={() => { setEditingEmpleado(undefined); setEditError(undefined); }}
        />
      )}

      {deletingEmpleado && (
        <DeleteEmpleadoDialog
          empleado={deletingEmpleado}
          error={deleteError}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeletingEmpleado(undefined); setDeleteError(undefined); }}
        />
      )}
    </div>
  );
}
