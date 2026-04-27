import { Brain, Activity, Scissors, Stethoscope } from "lucide-react";

const perfiles = [
  {
    icon: Brain,
    profesion: "Psicóloga",
    dolor:
      '"Mis pacientes se olvidan del turno y me entero cuando no aparecen. Termino llamando uno por uno."',
    solucion:
      "Pragma envía recordatorios automáticos antes de cada sesión. Si alguien cancela, el siguiente en lista de espera entra solo.",
    beneficio: "0 ausencias sin aviso",
  },
  {
    icon: Activity,
    profesion: "Kinesiólogo",
    dolor:
      '"Tengo tres profesionales y distintos tipos de sesión. Coordinar todo por WhatsApp es un caos."',
    solucion:
      "Un solo panel para gestionar múltiples profesionales y servicios. Cada uno con su agenda, sin pisarse.",
    beneficio: "Agenda unificada",
  },
  {
    icon: Scissors,
    profesion: "Peluquería",
    dolor:
      '"Mientras atiendo a un cliente no puedo responder los mensajes de turno. Pierdo reservas todo el día."',
    solucion:
      "Tu link de reserva funciona solo, 24/7. Los clientes eligen día y hora sin que vos intervengas.",
    beneficio: "Reservas sin parar",
  },
  {
    icon: Stethoscope,
    profesion: "Médico independiente",
    dolor:
      '"No sé cuánto cobré este mes ni qué pacientes son frecuentes. Todo está en cuadernos o en mi cabeza."',
    solucion:
      "Los ingresos se registran automáticamente con cada turno. Ves tu historial de pacientes y tus finanzas en un lugar.",
    beneficio: "Control del negocio",
  },
];

export function ParaQuienEsSection() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Para quién es
          </p>
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            ¿Te suena familiar?
          </h2>
          <p className="mt-3 text-slate-400">
            Pragma está hecho para profesionales independientes que trabajan con
            turnos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {perfiles.map(({ icon: Icon, profesion, dolor, solucion, beneficio }) => (
            <div
              key={profesion}
              className="group flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] cursor-default"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1c2a40]">
                    <Icon className="h-5 w-5 text-slate-300" />
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {profesion}
                  </span>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-300 whitespace-nowrap">
                  {beneficio}
                </span>
              </div>

              <p className="text-xs leading-relaxed text-slate-400 italic">
                {dolor}
              </p>

              <div className="border-t border-white/[0.07] pt-4">
                <p className="text-xs leading-relaxed text-slate-500">
                  {solucion}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
