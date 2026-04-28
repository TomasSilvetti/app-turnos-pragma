"use client";

import {
  Bell,
  ListOrdered,
  Users,
  DollarSign,
  Zap,
  HeadphonesIcon,
} from "lucide-react";
import dynamic from "next/dynamic";

const Aurora = dynamic(() => import("@/components/ui/Aurora"), { ssr: false });

const features = [
  {
    icon: Bell,
    title: "Recordatorios automáticos",
    description:
      "Enviá notificaciones antes del turno sin hacer nada. Tus clientes llegan, vos no perseguís.",
    benefit: "- inasistencias",
  },
  {
    icon: ListOrdered,
    title: "Lista de espera",
    description:
      "Cuando no hay turnos cercanos, el cliente se anota en lista de espera. Si alguien cancela, el sistema le avisa al instante para que tome ese lugar.",
    benefit: "0 turnos perdidos",
  },
  {
    icon: Users,
    title: "Seguimiento de clientes",
    description:
      "Conoce como crece tu negocio, quienes son tus clientes frecuentes y que servicios prefieren para ofrecerles promociones personalizadas.",
    benefit: "Agenda protegida",
  },
  {
    icon: DollarSign,
    title: "Módulo de finanzas",
    description:
      "Gestión de pagos automática, tus ingresos se cargan solos, vos solo cargas los gastos. Todo en un mismo lugar.",
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
      "Si necesitas ayuda para configurar al principio, te acompañamos en una sesión personalizada para que arranques sin dudas",
    benefit: "Sin fricción",
  },
];

// Azul marino muy oscuro: #050d1a
const NAVY = "#050d1a";

export function FuncionalidadesSection() {
  return (
    <section
      className="relative overflow-hidden border-t border-white/10"
      style={{ backgroundColor: NAVY }}
    >
      {/* Aurora — lateral derecho, fluye de arriba hacia abajo */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[65%] overflow-hidden">
        {/* -rotate-90 convierte el gradiente horizontal en vertical */}
        <div
          className="absolute origin-center -rotate-90"
          style={{ inset: "-30% -10% -30% -10%" }}
        >
          <Aurora
            colorStops={["#14532d", "#22c55e", "#86efac"]}
            blend={0.8}
            amplitude={1.5}
            speed={0.4}
          />
        </div>
        {/* Máscara que funde la aurora hacia el centro usando el color de fondo */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${NAVY}, ${NAVY}44, transparent)`,
          }}
        />
      </div>

      {/* Overlay muy suave para legibilidad */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: "rgba(5,13,26,0.2)" }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-green-400">
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
              className="group relative flex flex-col gap-4 rounded-2xl border border-green-500/20 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-200 hover:border-green-400/50 hover:bg-white/[0.06] cursor-default"
            >
              {/* Green glow on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 [background:radial-gradient(ellipse_at_top-left,rgba(74,222,128,0.07),transparent_60%)]" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-green-500/30 bg-green-950/60">
                  <Icon className="h-5 w-5 text-green-400" />
                </div>
                <span className="rounded-full border border-green-500/25 bg-green-950/50 px-2.5 py-1 text-xs font-medium text-green-300 whitespace-nowrap">
                  {benefit}
                </span>
              </div>
              <div>
                <h3 className="mb-1.5 text-sm font-semibold text-white">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-400">
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
