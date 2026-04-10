"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiposDeTurnoList } from "@/components/tipos-de-turno/TiposDeTurnoList";
import { TipoDeTurnoForm, type TipoDeTurno, type TipoDeTurnoFormValues } from "@/components/tipos-de-turno/TipoDeTurnoForm";
import { DeleteTipoDeTurnoDialog } from "@/components/tipos-de-turno/DeleteTipoDeTurnoDialog";

function apiToTipo(item: { id: string; title: string; description: string; price: number }): TipoDeTurno {
  return { id: item.id, titulo: item.title, descripcion: item.description, precio: item.price };
}

export default function TiposDeTurnoPage() {
  const [tipos, setTipos] = useState<TipoDeTurno[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoDeTurno | undefined>(undefined);
  const [deletingTipo, setDeletingTipo] = useState<TipoDeTurno | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/service-types")
      .then((r) => r.json())
      .then((data) => setTipos(data.map(apiToTipo)))
      .finally(() => setLoading(false));
  }, []);

  function handleAdd() {
    setEditingTipo(undefined);
    setFormOpen(true);
  }

  function handleEdit(tipo: TipoDeTurno) {
    setEditingTipo(tipo);
    setFormOpen(true);
  }

  async function handleSave(data: TipoDeTurnoFormValues) {
    const body = { title: data.titulo, description: data.descripcion, price: data.precio };

    if (editingTipo) {
      const res = await fetch(`/api/service-types/${editingTipo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setTipos((prev) => prev.map((t) => (t.id === editingTipo.id ? apiToTipo(updated) : t)));
      }
    } else {
      const res = await fetch("/api/service-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setTipos((prev) => [...prev, apiToTipo(created)]);
      }
    }

    setFormOpen(false);
    setEditingTipo(undefined);
  }

  function handleCancelForm() {
    setFormOpen(false);
    setEditingTipo(undefined);
  }

  function handleDeleteRequest(tipo: TipoDeTurno) {
    setDeletingTipo(tipo);
    setDeleteError(undefined);
  }

  async function handleDeleteConfirm() {
    if (!deletingTipo) return;
    setIsDeleting(true);
    setDeleteError(undefined);

    const res = await fetch(`/api/service-types/${deletingTipo.id}`, { method: "DELETE" });

    if (!res.ok) {
      const data = await res.json();
      setDeleteError(data.error ?? "No se pudo eliminar el tipo de turno.");
      setIsDeleting(false);
      return;
    }

    setTipos((prev) => prev.filter((t) => t.id !== deletingTipo.id));
    setDeletingTipo(undefined);
    setIsDeleting(false);
  }

  function handleDeleteCancel() {
    setDeletingTipo(undefined);
    setDeleteError(undefined);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="font-heading text-2xl text-[#253551]">Tipos de turno</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60">
            Administrá los tipos de turno que ofrecés a tus clientes.
          </p>
        </div>
        <p className="text-sm text-[#2A2829]/60">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl text-[#253551]">Tipos de turno</h1>
          <p className="mt-0.5 text-sm text-[#2A2829]/60">
            Administrá los tipos de turno que ofrecés a tus clientes.
          </p>
        </div>
        {tipos.length > 0 && (
          <Button
            onClick={handleAdd}
            className="bg-[#253551] text-white hover:bg-[#1c2a40] sm:shrink-0"
          >
            <Plus size={16} aria-hidden="true" />
            Agregar tipo de turno
          </Button>
        )}
      </div>

      <TiposDeTurnoList
        tipos={tipos}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onAdd={handleAdd}
      />

      {formOpen && (
        <TipoDeTurnoForm
          initialValues={editingTipo}
          onSave={handleSave}
          onCancel={handleCancelForm}
        />
      )}

      {deletingTipo && (
        <DeleteTipoDeTurnoDialog
          tipo={deletingTipo}
          error={deleteError}
          isDeleting={isDeleting}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
