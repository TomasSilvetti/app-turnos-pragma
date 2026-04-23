"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, Clock, User, AlertCircle, CheckCircle2 } from "lucide-react";

type VacanteData = {
  profesional: string;
  fecha: string;   // YYYY-MM-DD
  hora: string;    // HH:MM
  servicio: string | null;
  respaldo: { fecha: string; hora: string } | null;
};

type Estado =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "expirado" }
  | { tipo: "listo"; data: VacanteData }
  | { tipo: "confirmando" }
  | { tipo: "tomado" }
  | { tipo: "descartado" };

type ModalRespaldo = "cancelar" | "conservar" | null;

export default function VacanteClient() {
  const params = useSearchParams();
  const token = params.get("token");

  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [modalRespaldo, setModalRespaldo] = useState<ModalRespaldo>(null);
  const [confirmandoRespaldo, setConfirmandoRespaldo] = useState(false);

  useEffect(() => {
    if (!token) {
      setEstado({ tipo: "error", mensaje: "Token de notificación no válido." });
      return;
    }
    fetch(`/api/lista-espera/vacante?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (res.status === 410) { setEstado({ tipo: "expirado" }); return; }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setEstado({ tipo: "error", mensaje: (json as { error?: string }).error ?? "No se pudo cargar la información del turno." });
          return;
        }
        const data = await res.json() as VacanteData;
        setEstado({ tipo: "listo", data });
      })
      .catch(() => setEstado({ tipo: "error", mensaje: "Error de conexión." }));
  }, [token]);

  async function handleAceptar(conservarRespaldo: boolean) {
    if (!token) return;
    setConfirmandoRespaldo(true);
    setEstado({ tipo: "confirmando" });
    try {
      const res = await fetch("/api/lista-espera/aceptar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, conservarRespaldo }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setEstado({ tipo: "error", mensaje: (json as { error?: string }).error ?? "No se pudo reservar el turno." });
        return;
      }
      setEstado({ tipo: "tomado" });
    } catch {
      setEstado({ tipo: "error", mensaje: "Error de conexión." });
    } finally {
      setConfirmandoRespaldo(false);
      setModalRespaldo(null);
    }
  }

  async function handleDescartar() {
    if (!token) return;
    try {
      await fetch(`/api/lista-espera/descartar?token=${encodeURIComponent(token)}`, { method: "POST" });
    } catch {
      // silencioso
    }
    setEstado({ tipo: "descartado" });
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {estado.tipo === "cargando" && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex items-center justify-center py-16">
            <p className="font-body text-sm text-[#2A2829]/50">Verificando turno disponible...</p>
          </div>
        )}

        {estado.tipo === "expirado" && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex flex-col gap-4 items-center text-center">
            <AlertCircle size={32} className="text-amber-400" aria-hidden="true" />
            <div>
              <h1 className="font-heading text-base text-[#2A2829] mb-1">Este turno ya no está disponible</h1>
              <p className="font-body text-sm text-[#2A2829]/60">
                La ventana de reserva expiró o el turno fue tomado por otro cliente.
              </p>
            </div>
          </div>
        )}

        {estado.tipo === "error" && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex flex-col gap-4 items-center text-center">
            <AlertCircle size={32} className="text-[#ef4444]" aria-hidden="true" />
            <div>
              <h1 className="font-heading text-base text-[#2A2829] mb-1">Ocurrió un error</h1>
              <p className="font-body text-sm text-[#2A2829]/60">{estado.mensaje}</p>
            </div>
          </div>
        )}

        {estado.tipo === "tomado" && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex flex-col gap-4 items-center text-center">
            <CheckCircle2 size={32} className="text-[#22c55e]" aria-hidden="true" />
            <div>
              <h1 className="font-heading text-base text-[#2A2829] mb-1">¡Turno reservado!</h1>
              <p className="font-body text-sm text-[#2A2829]/60">
                Tu reserva fue confirmada. Revisá tu perfil para ver los detalles.
              </p>
            </div>
          </div>
        )}

        {estado.tipo === "descartado" && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex flex-col gap-4 items-center text-center">
            <p className="font-body text-sm text-[#2A2829]/60">
              Descartaste este turno. Seguís en la lista de espera para futuras vacantes.
            </p>
          </div>
        )}

        {estado.tipo === "confirmando" && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex items-center justify-center py-16">
            <p className="font-body text-sm text-[#2A2829]/50">Reservando turno...</p>
          </div>
        )}

        {estado.tipo === "listo" && !modalRespaldo && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex flex-col gap-5">
            <div>
              <p className="font-body text-xs text-[#2A2829]/50 uppercase tracking-widest mb-2">Turno disponible</p>
              <h1 className="font-heading text-lg text-[#2A2829]">Se liberó un turno</h1>
            </div>

            <div className="rounded-lg bg-[#F4F5F7] border border-[#E0E0DB] p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#2A2829]">
                <User size={14} aria-hidden="true" className="text-[#2A2829]/50" />
                <span className="font-body text-sm font-medium">{estado.data.profesional}</span>
              </div>
              <div className="flex items-center gap-2 text-[#2A2829]/70">
                <CalendarClock size={14} aria-hidden="true" />
                <span className="font-body text-sm capitalize">
                  {format(parseISO(estado.data.fecha), "EEEE d 'de' MMMM", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[#2A2829]/70">
                <Clock size={14} aria-hidden="true" />
                <span className="font-body text-sm">{estado.data.hora} hs</span>
              </div>
              {estado.data.servicio && (
                <p className="font-body text-xs text-[#2A2829]/50">{estado.data.servicio}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  if (estado.tipo === "listo" && estado.data.respaldo) {
                    setModalRespaldo("cancelar");
                  } else {
                    handleAceptar(false);
                  }
                }}
                className="w-full rounded-lg bg-[var(--brand-color)] px-4 py-2.5 font-body text-sm font-medium text-white hover:bg-[var(--brand-color-dark,#1c2a40)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-2"
              >
                Tomar este turno
              </button>
              <button
                type="button"
                onClick={handleDescartar}
                className="w-full rounded-lg border border-[#E0E0DB] px-4 py-2.5 font-body text-sm font-medium text-[#2A2829] hover:bg-[#F4F5F7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#253551] focus-visible:ring-offset-2"
              >
                No me interesa
              </button>
            </div>

            <p className="font-body text-xs text-[#2A2829]/50 text-center">
              El turno disponible es el{" "}
              <span className="font-medium text-[#2A2829]/70 capitalize">
                {format(parseISO(estado.data.fecha), "EEEE d 'de' MMMM", { locale: es })}
              </span>{" "}
              a las <span className="font-medium text-[#2A2829]/70">{estado.data.hora} hs</span>.
              Buscá esa fecha en el calendario para reservarlo.
            </p>
          </div>
        )}

        {estado.tipo === "listo" && modalRespaldo && (
          <div className="rounded-xl bg-white border border-[#E0E0DB] p-6 flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-base text-[#2A2829]">¿Qué hacés con tu turno reservado?</h2>
              {estado.data.respaldo && (
                <p className="font-body text-sm text-[#2A2829]/60 mt-1">
                  Tenés un turno el{" "}
                  {format(parseISO(estado.data.respaldo.fecha), "d/MM/yyyy", { locale: es })} a las{" "}
                  {estado.data.respaldo.hora} hs.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleAceptar(false)}
                disabled={confirmandoRespaldo}
                className="w-full rounded-lg bg-[var(--brand-color)] px-4 py-2.5 font-body text-sm font-medium text-white hover:bg-[var(--brand-color-dark,#1c2a40)] transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-color)] focus-visible:ring-offset-2"
              >
                Cancelar mi turno anterior
              </button>
              <button
                type="button"
                onClick={() => handleAceptar(true)}
                disabled={confirmandoRespaldo}
                className="w-full rounded-lg border border-[#E0E0DB] px-4 py-2.5 font-body text-sm font-medium text-[#2A2829] hover:bg-[#F4F5F7] transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#253551] focus-visible:ring-offset-2"
              >
                Conservar ambos
              </button>
              <button
                type="button"
                onClick={() => setModalRespaldo(null)}
                className="font-body text-xs text-[#2A2829]/40 hover:text-[#2A2829] transition-colors mt-1"
              >
                Volver
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
