import { TurnosConfigForm } from "@/components/turnos/TurnosConfigForm";

export default function DashboardTurnosPage() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-[#2A2829]">Configuración de turnos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Definí el horario de atención, el intervalo entre turnos y el precio por turno.
        </p>
      </div>
      <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 sm:p-8">
        <TurnosConfigForm
          onSubmit={async (data) => {
            console.log("Configuración guardada:", data);
          }}
        />
      </div>
    </div>
  );
}
