import { Quote } from "lucide-react";

// TODO: reemplazar con testimonios reales cuando haya usuarios
const testimonios = [
  {
    nombre: "Valentina R.",
    rubro: "Psicóloga",
    resultado: "Huecos que se llenan solos",
    frase:
      "Cuando alguien cancelaba, me quedaba con un hueco y tenía que llamar una por una hasta encontrar quien pudiera venir. Ahora la lista de espera lo resuelve sola. Ni me entero.",
  },
  {
    nombre: "Ezequiel M.",
    rubro: "Kinesiólogo",
    resultado: "Casi 0 olvidos de turno",
    frase:
      "Antes me pasaba seguido: esperaba al paciente y nunca aparecía. Horas tiradas. Desde que activé los recordatorios automáticos, casi nadie se olvida. Es una diferencia enorme.",
  },
  {
    nombre: "Sofía T.",
    rubro: "Peluquería",
    resultado: "Reservas 24/7",
    frase:
      "Los clientes reservan mientras duermo. El link de turno lo tengo en mi Instagram y ya no pierdo ni una consulta por estar atendiendo.",
  },
];

export function TestimoniosSection() {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Lo que dicen
          </p>
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Profesionales que ya cambiaron su agenda
          </h2>
          <p className="mt-3 text-slate-400">
            Resultados reales de quienes dejaron el WhatsApp y los cuadernos atrás.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {testimonios.map(({ nombre, rubro, resultado, frase }) => (
            <div
              key={nombre}
              className="group flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-300 hover:border-yellow-400/40 hover:bg-yellow-400/[0.04] hover:shadow-[0_0_24px_0_rgba(250,204,21,0.06)] cursor-default"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{nombre}</p>
                  <p className="text-xs text-slate-500">{rubro}</p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-slate-300">
                  {resultado}
                </span>
              </div>

              {/* Quote */}
              <div className="flex flex-col gap-3">
                <Quote className="h-4 w-4 text-slate-600" />
                <p className="text-sm leading-relaxed text-slate-400 italic">
                  {frase}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
