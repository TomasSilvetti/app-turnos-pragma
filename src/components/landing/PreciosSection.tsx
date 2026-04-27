"use client";

import Link from "next/link";
import {
  Bell,
  ListOrdered,
  Users,
  DollarSign,
  Zap,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const featuresWithValue = [
  {
    icon: Bell,
    name: "Recordatorios automáticos",
    description: "Notificaciones antes del turno sin levantar un dedo",
    price: 30000,
  },
  {
    icon: ListOrdered,
    name: "Lista de espera inteligente",
    description: "Rellena huecos automáticamente cuando se cancela un turno",
    price: 40000,
  },
  {
    icon: Users,
    name: "Seguimiento de clientes",
    description: "Historial, frecuencia y preferencias de cada cliente",
    price: 50000,
  },
  {
    icon: DollarSign,
    name: "Módulo de finanzas",
    description: "Ingresos automáticos, gastos manuales, todo centralizado",
    price: 25000,
  },
  {
    icon: Zap,
    name: "Agenda online 24/7",
    description: "Tu link de reserva siempre disponible, sin doble turnos",
    price: 30000,
  }
];

const totalIndividual = featuresWithValue.reduce((s, f) => s + f.price, 0);
const planPrice = 50000;

function formatARS(n: number) {
  return "$" + n.toLocaleString("es-AR");
}

export function PreciosSection() {
  return (
    <section className="border-t border-white/10" id="precios">
      <div className="mx-auto max-w-6xl px-6 py-24">

        {/* Anchor de valor */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-slate-500">
            Precios
          </p>
          <h2 className="text-3xl font-bold text-white md:text-5xl">
            ¿Cuánto perdés por{" "}
            <span className="text-slate-400">un turno vacío</span> al mes?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Cada hueco en tu agenda es plata que se va. Calculá cuánto: si
            cobrás{" "}
            <span className="text-white font-medium">$15.000 por turno</span> y
            perdés 4 al mes, son{" "}
            <span className="text-white font-medium">$60.000 que no entraron</span>.
          </p>
        </div>

        {/* Vacantes limitadas */}
        <div className="mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <div className="flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500/80">
                Acceso exclusivo - 4 vacantes
              </p>
              <h3 className="text-lg font-bold text-white">
                Estamos arrancando y queremos desarrollar la mejor experiencia para vos
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Estamos incorporando a un grupo pequeño de profesionales de forma
                personal. Queremos ofrecer la mejor app posible, por eso daremos nuestro numero personal para ofrecerte atención directa por parte de nuestro equipo, configuracion inicial asistida y la posibilidad de agregar nuevos cambios en la app que se adapten a tu forma de trabajar.
              </p>
            </div>
            <div className="shrink-0 text-center">
              <div className="inline-flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-8 py-5">
                <span className="text-5xl font-bold text-amber-400">2</span>
                <span className="mt-1 text-xs font-medium text-amber-500/80">
                  vacantes restantes
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-white/[0.06] pt-5">
            {[
              "Implementación asistida por nuestro equipo",
              "Canal directo de feedback con el equipo de desarrollo",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="text-xs text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Desglose de valor por funcionalidad */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-10">
          <p className="mb-6 text-center text-sm text-slate-500">
            Si contratases cada herramienta por separado, pagarías:
          </p>
          <div className="divide-y divide-white/[0.06]">
            {featuresWithValue.map(({ icon: Icon, name, description, price }, i) => (
              <div
                key={name}
                className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1c2a40]">
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-slate-500 truncate">{description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-300">
                    {formatARS(price)}
                    <span className="text-slate-600">/mes</span>
                  </p>
                  {i > 0 && (
                    <p className="text-xs text-slate-600">
                      +{formatARS(featuresWithValue.slice(0, i + 1).reduce((s, f) => s + f.price, 0))} acumulado
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total vs plan */}
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:justify-between">
            <div>
              <p className="text-xs text-slate-500">Total herramientas por separado</p>
              <p className="text-2xl font-bold text-slate-400 line-through decoration-red-500/60">
                {formatARS(totalIndividual)}/mes
              </p>
            </div>
            <div className="hidden h-10 w-px bg-white/10 sm:block" />
            <div className="text-center sm:text-right">
              <p className="text-xs text-slate-500">pragma turnos — todo incluido</p>
              <p className="text-3xl font-bold text-white">
                {formatARS(planPrice)}
                <span className="text-base font-normal text-slate-500">/mes</span>
              </p>
              <p className="text-xs text-emerald-500 font-medium mt-0.5">
                Ahorrás {formatARS(totalIndividual - planPrice)} al mes
              </p>
            </div>
          </div>
        </div>

        {/* Plan único + Garantía */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 md:items-start">
          {/* Plan */}
          <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/[0.05] p-8 shadow-2xl">
            <div className="absolute right-5 top-5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              Primera semana gratis
            </div>

            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Plan único
            </p>
            <h3 className="text-2xl font-bold text-white">pragma turnos</h3>
            <p className="mt-1 text-sm text-slate-400">
              Todas las funcionalidades desde el minuto uno.
            </p>

            <div className="my-6 flex items-end gap-2">
              <span className="text-5xl font-bold text-white">$50K</span>
              <span className="mb-1 text-slate-500 text-sm">ARS/mes</span>
            </div>

            <ul className="mb-8 space-y-3">
              {featuresWithValue.map(({ icon: Icon, name }) => (
                <li key={name} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-300">{name}</span>
                </li>
              ))}
              {[
                "Link de reserva único para tu negocio",
                "Soporte por WhatsApp",
                "Sin contratos ni costos ocultos",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="text-sm text-slate-300">{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-[#0f1623] transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Empezar gratis una semana
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-center text-xs text-slate-600">
              Sin tarjeta de crédito · Cancelá cuando quieras
            </p>
          </div>

          {/* Garantía */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <svg
                className="h-6 w-6 text-slate-300"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">
              Garantía de recupero en 2 meses
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Si usás la lista de espera y en los primeros{" "}
              <span className="text-white font-medium">2 meses</span> no recuperás
              lo que pagaste, te devolvemos cada peso. Sin preguntas, sin vueltas.
            </p>
            <p className="mt-4 text-xs text-slate-600">
              Confiamos en la herramienta. El riesgo es nuestro.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
