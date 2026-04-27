"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  const [vacantes, setVacantes] = useState(3);

  useEffect(() => {
    const stored = localStorage.getItem("pragma_vacantes");
    if (stored === "2") {
      setVacantes(2);
      return;
    }
    const timer = setTimeout(() => {
      setVacantes(2);
      localStorage.setItem("pragma_vacantes", "2");
    }, 2.5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="border-t border-white/10" id="precios">
      <style>{`
        @keyframes metallicShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes greenPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0), 0 0 18px 2px rgba(34,197,94,0.10); }
          50%       { box-shadow: 0 0 0 0 rgba(34,197,94,0), 0 0 28px 6px rgba(34,197,94,0.22); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes amberPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0), 0 0 18px 2px rgba(245,158,11,0.10); }
          50%       { box-shadow: 0 0 0 0 rgba(245,158,11,0), 0 0 28px 6px rgba(245,158,11,0.22); }
        }
      `}</style>
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
        <div
          className="mb-10 rounded-2xl p-6 md:p-8"
          style={{
            background: "linear-gradient(145deg, rgba(34,24,10,0.95) 0%, rgba(25,18,8,0.98) 100%)",
            border: "1px solid rgba(245,158,11,0.25)",
            animation: "amberPulse 3s ease-in-out infinite",
          }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-8">
            <div className="flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500/80">
                Acceso exclusivo - 4 vacantes
              </p>
              <h3
                className="text-lg font-bold"
                style={{
                  background: "linear-gradient(90deg, #fbbf24, #fde68a, #fbbf24)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  animation: "shimmer 3s linear infinite",
                }}
              >
                Estamos arrancando y queremos desarrollar la mejor experiencia para vos
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Estamos incorporando a un grupo pequeño de profesionales de forma
                personal. Queremos ofrecer la mejor app posible, por eso daremos nuestro numero personal para ofrecerte atención directa por parte de nuestro equipo, configuracion inicial asistida y la posibilidad de agregar nuevos cambios en la app que se adapten a tu forma de trabajar.
              </p>
            </div>
            <div className="shrink-0 text-center">
              <div
                className="inline-flex flex-col items-center rounded-xl px-8 py-5"
                style={{
                  background: "rgba(245,158,11,0.10)",
                  border: "1px solid rgba(245,158,11,0.30)",
                }}
              >
                <span className="text-5xl font-bold text-amber-400">{vacantes}</span>
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
          <div className="relative p-[2px] rounded-2xl" style={{background: "linear-gradient(135deg, #c0c0c0 0%, #e8d5b7 15%, #b87333 28%, #e8e8e8 40%, #9b9b9b 50%, #d4af37 62%, #c0c0c0 72%, #f0e68c 82%, #b8b8b8 90%, #e0d0a0 100%)", backgroundSize: "300% 300%", animation: "metallicShift 4s ease infinite"}}>
          <div className="relative overflow-hidden rounded-[14px] bg-[#0d1420] p-8 shadow-2xl">
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
              className="relative flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/30 overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #d4d4d4 0%, #f5e6c8 12%, #c8a882 22%, #e8e8e8 32%, #a8a8a8 42%, #f0d060 52%, #d4d4d4 62%, #f5f0d0 72%, #b8b8b8 82%, #e8deb0 92%, #d0d0d0 100%)",
                backgroundSize: "300% 300%",
                animation: "metallicShift 3s ease infinite",
                color: "#1a1a1a",
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Empezar gratis una semana
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <p className="mt-3 text-center text-xs text-slate-600">
              Sin tarjeta de crédito · Cancelá cuando quieras
            </p>
          </div>
          </div>

          {/* Garantía */}
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: "linear-gradient(145deg, rgba(17,34,24,0.95) 0%, rgba(10,25,18,0.98) 100%)",
              border: "1px solid rgba(34,197,94,0.25)",
              animation: "greenPulse 3s ease-in-out infinite",
            }}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10" style={{border: "1px solid rgba(34,197,94,0.3)"}}>
              <svg
                className="h-6 w-6 text-emerald-400"
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
            <h3
              className="text-base font-bold"
              style={{
                background: "linear-gradient(90deg, #4ade80, #86efac, #4ade80)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "shimmer 3s linear infinite",
              }}
            >
              Garantía de recupero en 2 meses
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Si usás la lista de espera y en los primeros{" "}
              <span className="font-medium text-emerald-300">2 meses</span> no recuperás
              lo que pagaste, te devolvemos cada peso. Sin preguntas, sin vueltas.
            </p>
            <div className="mt-5 rounded-lg px-4 py-2" style={{background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)"}}>
              <p className="text-xs font-medium text-emerald-400">
                Confiamos en la herramienta. Nosotros asumimos el riesgo.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
