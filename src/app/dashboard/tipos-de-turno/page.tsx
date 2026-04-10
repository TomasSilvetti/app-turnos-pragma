"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TiposDeTurnoList } from "@/components/tipos-de-turno/TiposDeTurnoList";
import { TipoDeTurnoForm, type TipoDeTurno, type TipoDeTurnoFormValues } from "@/components/tipos-de-turno/TipoDeTurnoForm";
import { DeleteTipoDeTurnoDialog } from "@/components/tipos-de-turno/DeleteTipoDeTurnoDialog";

const mockTipos: TipoDeTurno[] = [
  { id: "1", titulo: "Consulta general", descripcion: "Atención médica de primer nivel", precio: 5000 },
  { id: "2", titulo: "Control de seguimiento", descripcion: "Seguimiento de tratamiento en curso", precio: 3500 },
];

export default function TiposDeTurnoPage() {
  const [tipos, setTipos] = useState<TipoDeTurno[]>(mockTipos);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoDeTurno | undefined>(undefined);
  const [deletingTipo, setDeletingTipo] = useState<TipoDeTurno | undefined>(undefined);
  const [deleteError, setDeleteError] = useState<string | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleAdd() {
    setEditingTipo(undefined);
    setFormOpen(true);
  }

  function handleEdit(tipo: TipoDeTurno) {
    setEditingTipo(tipo);
    setFormOpen(true);
  }

  function handleSave(data: TipoDeTurnoFormValues) {
    if (editingTipo) {
      setTipos((prev) =>
        prev.map((t) => (t.id === editingTipo.id ? { ...editingTipo, ...data } : t))
      );
    } else {
      const newTipo: TipoDeTurno = {
        id: Date.now().toString(),
        ...data,
      };
      setTipos((prev) => [...prev, newTipo]);
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

    // Simulación: si el id es "1" simular error de reservas activas
    await new Promise((r) => setTimeout(r, 600));
    if (deletingTipo.id === "RESERVAS_ACTIVAS") {
      setDeleteError(
        "No podés eliminar este tipo de turno porque tiene reservas futuras. Cancelalas primero."
      );
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
