"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";

export function CTAFinalSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top edge bleed from dark section */}
      <div className="absolute inset-x-0 top-0 h-px bg-black/10" />

      <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">

        {/* Headline */}
        <h2 className="mb-4 text-5xl font-bold leading-tight tracking-tight text-black sm:text-6xl lg:text-7xl">
          Tu agenda llena,
          <br />
          <span className="text-black/30">tu tiempo tuyo.</span>
        </h2>

        {/* Subheadline */}
        <p className="mx-auto mb-12 max-w-xl text-lg leading-relaxed text-black/50">
          Miles de profesionales ya gestionan sus turnos sin estrés.
          Configurá tu cuenta en 7 minutos y empezá a recibir reservas hoy.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 rounded-lg bg-black px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-black/30 focus:ring-offset-2 focus:ring-offset-white"
          >
            Empezar gratis
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2.5}
            />
          </Link>

          <a
            href="https://wa.me/543815122808?text=Hola%20quiero%20una%20demo%20personalizada%20para%20la%20app%20de%20Pragma%20Turnos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-8 py-4 text-base font-medium text-black/60 transition-all duration-200 hover:border-black/30 hover:text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 focus:ring-offset-white"
          >
            Pedir una demo
          </a>
        </div>

        {/* Trust micro-copy */}
        <p className="mt-8 text-sm text-black/30">
          Sin costo. 
        </p>
      </div>

      {/* Bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/10" />
    </section>
  );
}
