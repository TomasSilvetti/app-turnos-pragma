"use client";

import { useEffect, useRef, useState } from "react";

// TODO: reemplazar con datos reales
const DOLORES = [
  {
    titulo: "Turnos cancelados a último momento",
    descripcion:
      "El cliente avisa una hora antes — o no avisa. El hueco queda vacío y no hay forma de llenarlo a tiempo.",
    metricaValor: "1 de 4",
    metricaEtiqueta: "turnos se cancela sin aviso previo",
    icono: "ban",
  },
  {
    titulo: "Clientes que se olvidan del turno",
    descripcion:
      "Llegás a horario, esperás, mandás un mensaje. El cliente se olvidó. Hora perdida, ingreso perdido.",
    metricaValor: "~40 min",
    metricaEtiqueta: "perdidos por turno no confirmado",
    icono: "clock",
  },
  {
    titulo: "No sabés cuánto ganás por mes",
    descripcion:
      "Los cobros están en la cabeza, en notas, en WhatsApp. A fin de mes no cerrás los números.",
    metricaValor: "Sin control",
    metricaEtiqueta: "de ingresos y cobros",
    icono: "wallet",
  },
  {
    titulo: "Tiempo perdido coordinando por WhatsApp",
    descripcion:
      '"¿Tenés el martes a las 10?" "No, ese no puedo." Cada turno nuevo cuesta 5 mensajes y 10 minutos.',
    metricaValor: "+1 hs",
    metricaEtiqueta: "por semana en coordinación manual",
    icono: "message",
  },
  {
    titulo: "Agenda desorganizada en papel o WhatsApp",
    descripcion:
      "Un anotador, un grupo de WhatsApp, quizás una hoja de cálculo. Todo manual, todo propenso a errores.",
    metricaValor: "Sin sistema",
    metricaEtiqueta: "confiable de turnos",
    icono: "chaos",
  },
] as const;

// TODO: reemplazar con datos reales
const STATS = [
  {
    numero: "25%",
    texto:
      "de los turnos agendados no se presentan sin un sistema de recordatorios activo.",
  },
  {
    numero: "52 turnos",
    texto:
      "perdés al año si solo un cliente por semana cancela sin aviso. Multiplicá por tu precio.",
  },
] as const;

type IconoTipo = "ban" | "clock" | "wallet" | "message" | "chaos";

function IconoDolor({ tipo }: { tipo: IconoTipo }) {
  const RED = "#E24B4A";
  const cls = "w-4 h-4 shrink-0 mt-0.5";

  if (tipo === "ban")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth={2.2} strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    );

  if (tipo === "clock")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth={2.2} strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
        <line x1="12" y1="2" x2="12" y2="4" />
      </svg>
    );

  if (tipo === "wallet")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth={2.2} strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M16 12h.01" strokeWidth={3} />
        <path d="M2 10h20" />
      </svg>
    );

  if (tipo === "message")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth={2.2} strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <line x1="9" y1="10" x2="15" y2="10" />
        <line x1="9" y1="14" x2="13" y2="14" />
      </svg>
    );

  // chaos
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth={2.2} strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <line x1="17" y1="2" x2="21" y2="6" />
      <line x1="17" y1="10" x2="21" y2="6" />
    </svg>
  );
}

function DolorItem({
  titulo,
  descripcion,
  metricaValor,
  metricaEtiqueta,
  icono,
  visible,
  delay,
}: (typeof DOLORES)[number] & { visible: boolean; delay: number }) {
  return (
    <div
      style={{
        transitionDelay: visible ? `${delay}ms` : "0ms",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.45s ease, transform 0.45s ease",
      }}
      className="relative flex items-start justify-between gap-4 overflow-hidden rounded-xl border border-red-900/30 bg-red-950/10 px-5 py-4 backdrop-blur-sm"
    >
      {/* Borde izquierdo rojo */}
      <span
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-xl"
        style={{ background: "#E24B4A" }}
        aria-hidden
      />

      <div className="flex min-w-0 items-start gap-3 pl-2">
        <IconoDolor tipo={icono} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-white">
            {titulo}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
            {descripcion}
          </p>
        </div>
      </div>

      {/* Métrica — derecha en sm+ */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[17px] font-medium leading-tight text-white">
          {metricaValor}
        </p>
        <p className="mt-0.5 max-w-[120px] text-[11px] leading-snug text-slate-500">
          {metricaEtiqueta}
        </p>
      </div>

      {/* Métrica en mobile: debajo */}
      <div className="mt-2 w-full pl-7 sm:hidden">
        <p className="text-[15px] font-medium text-white">{metricaValor}</p>
        <p className="text-[11px] text-slate-500">{metricaEtiqueta}</p>
      </div>
    </div>
  );
}

export function ElProblemaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="problema"
      ref={sectionRef}
      className="relative border-t border-white/10 overflow-hidden"
    >
<div className="relative mx-auto max-w-3xl px-6 py-24">
        {/* Encabezado */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
          className="mb-10"
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            El Problema
          </p>
          <h2
            className="text-[30px] font-medium leading-tight text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            Tu agenda debería trabajar para vos,&nbsp;no al revés.
          </h2>
          <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-slate-400">
            Sin una herramienta que lo gestione, cada turno vacío es tiempo y
            dinero que no recuperás.
          </p>
        </div>

        {/* Lista animada de dolores */}
        <div className="space-y-3">
          {DOLORES.map((dolor, i) => (
            <DolorItem
              key={dolor.titulo}
              {...dolor}
              visible={visible}
              delay={i * 90 + 80}
            />
          ))}
        </div>

        {/* Estadísticas al pie */}
        <div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.45s ease, transform 0.45s ease",
            transitionDelay: visible ? "560ms" : "0ms",
          }}
        >
          {STATS.map((stat) => (
            <div
              key={stat.numero}
              className="rounded-xl bg-white/[0.04] px-6 py-5"
            >
              <p
                className="text-[32px] font-medium leading-none text-white"
                style={{ letterSpacing: "-0.01em" }}
              >
                {stat.numero}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-400">
                {stat.texto}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
