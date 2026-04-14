"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SucursalList } from "@/components/sucursales/SucursalList";
import { SucursalForm } from "@/components/sucursales/SucursalForm";
import { DeleteSucursalDialog } from "@/components/sucursales/DeleteSucursalDialog";
import type { Sucursal, SucursalFormValues } from "@/components/sucursales/types";

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingSucursal, setDeletingSucursal] = useState<Sucursal | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/sucursales")
      .then((r) => r.json())
      .then((data) => setSucursales(Array.isArray(data) ? data : []))
      .catch(() => setSucursales([]))
      .finally(() => setLoading(false));
  }, []);

  function handleAdd() {
    setEditingSucursal(undefined);
    setFormError(undefined);
    setFormOpen(true);
  }

  function handleEdit(sucursal: Sucursal) {
    setEditingSucursal(sucursal);
    setFormError(undefined);
    setFormOpen(true);
  }

  async function handleSave(data: SucursalFormValues) {
    setIsSaving(true);
    setFormError(undefined);

    if (editingSucursal) {
      const res = await fetch(`/api/sucursales/${editingSucursal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setSucursales((prev) =>
          prev.map((s) =>
            s.id === editingSucursal.id
              ? { ...s, name: updated.name, address: updated.address }
              : s
          )
        );
        setFormOpen(false);
        setEditingSucursal(undefined);
      } else {
        const err = await res.json();
        setFormError(err.error ?? "No se pudo guardar la sucursal.");
      }
    } else {
      const res = await fetch("/api/sucursales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        setSucursales((prev) => [...prev, { ...created, employeeCount: 0 }]);
        setFormOpen(false);
      } else {
        const err = await res.json();
        setFormError(err.error ?? "No se pudo crear la sucursal.");
      }
    }

    setIsSaving(false);
  }

  function handleCancelForm() {
    setFormOpen(false);
    setEditingSucursal(undefined);
    setFormError(undefined);
  }

  function handleDeleteRequest(sucursal: Sucursal) {
    setDeletingSucursal(sucursal);
    setDeleteError(undefined);
  }

  async function handleDeleteConfirm() {
    if (!deletingSucursal) return;
    setIsDeleting(true);
    setDeleteError(undefined);

    const res = await fetch(`/api/sucursales/${deletingSucursal.id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "No se pudo eliminar la sucursal.");
      setIsDeleting(false);
      return;
    }

    setSucursales((prev) => prev.filter((s) => s.id !== deletingSucursal.id));
    setDeletingSucursal(undefined);
    setIsDeleting(false);
  }

  function handleDeleteCancel() {
    setDeletingSucursal(undefined);
    setDeleteError(undefined);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Sucursales</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Administrá las sucursales de tu empresa.
          </p>
        </div>
        <p className="text-sm text-[#2A2829]/60 dark:text-[#64748b]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Sucursales</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60 dark:text-[#94a3b8]">
            Administrá las sucursales de tu empresa.
          </p>
        </div>
        {sucursales.length > 0 && (
          <Button
            onClick={handleAdd}
            className="bg-[var(--brand-color)] text-white hover:bg-[#1c2a40] sm:shrink-0"
          >
            <Plus size={16} aria-hidden="true" />
            Nueva sucursal
          </Button>
        )}
      </div>

      <SucursalList
        sucursales={sucursales}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onAdd={handleAdd}
      />

      {formOpen && (
        <SucursalForm
          initialValues={editingSucursal}
          isSaving={isSaving}
          error={formError}
          onSave={handleSave}
          onCancel={handleCancelForm}
        />
      )}

      {deletingSucursal && (
        <DeleteSucursalDialog
          sucursal={deletingSucursal}
          error={deleteError}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
