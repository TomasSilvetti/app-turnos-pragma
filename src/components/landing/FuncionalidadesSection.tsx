import {
  Bell,
  ListOrdered,
  Users,
  DollarSign,
  Zap,
  HeadphonesIcon,
} from "lucide-react";

const features = [
  {
    icon: Bell,
    title: "Recordatorios automáticos",
    description:
      "Enviá notificaciones antes del turno sin hacer nada. Tus clientes llegan, vos no perseguís.",
    benefit: "-40% inasistencias",
  },
  {
    icon: ListOrdered,
    title: "Lista de espera",
    description:
      "Cuando se cancela un turno, el siguiente en la lista entra automáticamente. Ningún hueco queda vacío.",
    benefit: "0 turnos perdidos",
  },
  {
    icon: Users,
    title: "seguimiento de clientes",
    description:
      "Conoce como crece tu negocio, quienes son tus clientes frecuentes y que servicios prefieren para ofrecerles promociones personalizadas.",
    benefit: "Agenda protegida",
  },
  {
    icon: DollarSign,
    title: "Módulo de finanzas",
    description:
      "Gestion de pagos automatica, tus ingresos se cargan solos, vos solo cargas los gastos. Todo en un mismo lugar.",
    benefit: "Control total",
  },
  {
    icon: Zap,
    title: "Configuración fácil",
    description:
      "Sin técnicos ni desarrolladores. Cargás tus servicios, horarios y listo. Tu agenda está online.",
    benefit: "Listo en 7 min",
  },
  {
    icon: HeadphonesIcon,
    title: "Onboarding 1 a 1",
    description:
      "Te acompañamos en la configuración inicial para que arranques sin dudas y con todo funcionando.",
    benefit: "Sin fricción",
  },
];

export function FuncionalidadesSection() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Funcionalidades
          </p>
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Soluciones a los problemas reales
          </h2>
          <p className="mt-3 text-slate-400">
            Cada función existe porque alguien la necesitaba. Nada de relleno.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description, benefit }) => (
            <div
              key={title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] cursor-default"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1c2a40]">
                  <Icon className="h-5 w-5 text-slate-300" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-300 whitespace-nowrap">
                  {benefit}
                </span>
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-white">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}