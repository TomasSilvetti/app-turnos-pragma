"use client";

import { Fragment, useEffect, useRef, useState } from "react";

const PASOS = [
  {
    numero: "01",
    titulo: "Configurás tus horarios",
    descripcion:
      "Definís los servicios que ofrecés y los horarios en los que atendés. Listo en minutos.",
    icono: (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="h-9 w-9"
        aria-hidden="true"
      >
        <rect x="6" y="10" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <line x1="6" y1="17" x2="34" y2="17" stroke="currentColor" strokeWidth="1.8" />
        <line x1="13" y1="6" x2="13" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="27" y1="6" x2="27" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="14" cy="24" r="1.5" fill="currentColor" />
        <circle cx="20" cy="24" r="1.5" fill="currentColor" />
        <circle cx="26" cy="24" r="1.5" fill="currentColor" />
        <circle cx="14" cy="30" r="1.5" fill="currentColor" />
        <circle cx="20" cy="30" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    numero: "02",
    titulo: "Tus clientes sacan turno solos",
    descripcion:
      "Compartís un link único. Ellos eligen servicio, día y horario sin llamadas ni mensajes.",
    icono: (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="h-9 w-9"
        aria-hidden="true"
      >
        <rect x="12" y="4" width="16" height="28" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <line x1="17" y1="29" x2="23" y2="29" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="18" x2="24" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M26 8 L33 8 L33 20 L26 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="29" y1="8" x2="29" y2="4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <polyline points="27,6 29,4 31,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    numero: "03",
    titulo: "La agenda se gestiona sola",
    descripcion:
      "Confirmaciones y recordatorios automáticos. Vos solo aparecés a atender.",
    icono: (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="h-9 w-9"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="1.8" />
        <polyline points="14,20 18,24 26,16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 8 Q34 14 34 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 2" />
      </svg>
    ),
  },
] as const;

function Conector() {
  return (
    <div className="hidden md:flex items-center justify-center w-12 shrink-0 mt-10">
      <svg viewBox="0 0 48 16" fill="none" className="w-12" aria-hidden="true">
        <line
          x1="0"
          y1="8"
          x2="36"
          y2="8"
          stroke="#334155"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <polyline
          points="30,3 40,8 30,13"
          stroke="#334155"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function ComoFuncionaSection() {
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
      id="como-funciona"
      ref={sectionRef}
      className="mx-auto max-w-6xl px-6 py-24"
    >
      {/* Encabezado */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
        className="mb-16 text-center"
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Cómo funciona
        </p>
        <h2
          className="text-[30px] font-medium leading-tight text-white"
          style={{ letterSpacing: "-0.02em" }}
        >
          Tres pasos y ya estás operativo.
        </h2>
        <p className="mt-3 text-[15px] text-slate-400">
          Sin configuraciones complejas ni conocimientos técnicos.
        </p>
      </div>

      {/* Pasos */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-center gap-0">
        {PASOS.map((paso, i) => (
          <Fragment key={paso.numero}>
            <div
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
                transitionDelay: visible ? `${i * 120 + 80}ms` : "0ms",
              }}
              className="flex-1 flex flex-col items-center text-center px-4 py-8 md:py-0 relative"
            >
              {/* Línea vertical en mobile entre pasos */}
              {i < PASOS.length - 1 && (
                <div
                  className="md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10"
                  aria-hidden="true"
                />
              )}

              {/* Número */}
              <p
                className="mb-5 text-[52px] font-bold leading-none text-white/20"
                style={{ letterSpacing: "-0.03em" }}
              >
                {paso.numero}
              </p>

              {/* Ícono */}
              <div className="mb-5 flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
                {paso.icono}
              </div>

              {/* Texto */}
              <h3
                className="mb-2 text-[16px] font-semibold text-white"
                style={{ letterSpacing: "-0.01em" }}
              >
                {paso.titulo}
              </h3>
              <p className="max-w-[200px] text-[13px] leading-relaxed text-slate-400">
                {paso.descripcion}
              </p>
            </div>

            {/* Conector entre pasos */}
            {i < PASOS.length - 1 && <Conector />}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
