"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "¿Es difícil configurar?",
    answer:
      "No. En menos de 7 minutos ya tenés tu agenda lista para recibir reservas. Solo completás los datos de tu empresa, agregás tus servicios y compartís tu link. Sin contratar a nadie, sin conocimientos técnicos.",
  },
  {
    question: "¿Mis clientes van a usarlo?",
    answer:
      "Sí. Tus clientes reservan desde el celular sin descargar ninguna app, en menos de un minuto. Si saben escribir un mensaje de WhatsApp, saben usar Pragma Turnos.",
  },
  {
    question: "¿Funciona si atiendo por orden de llegada?",
    answer:
      "Perfectamente. Podés configurar franjas horarias amplias o turnos fijos según cómo trabajés. El sistema se adapta a tu modalidad, no al revés.",
  },
  {
    question: "¿Puedo cancelar cuando quiero?",
    answer:
      "Sí, sin letra chica. No hay contratos de permanencia ni penalizaciones. Cancelás en cualquier momento desde tu cuenta.",
  },
  {
    question: "¿Qué pasa si no sé usar apps?",
    answer:
      "El panel está diseñado para que cualquier persona pueda manejarlo. Si en algún momento tenés una duda, te acompañamos.",
  },
  {
    question: "¿Mis datos y los de mis clientes están seguros?",
    answer:
      "Sí. Toda la información se almacena con cifrado y cumplimos los estándares de seguridad. Tus datos son tuyo y jamás los compartimos con terceros.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors duration-150 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        aria-expanded={isOpen}
      >
        <span
          className={`text-sm font-medium transition-colors duration-150 md:text-base ${
            isOpen ? "text-white" : "text-slate-300"
          }`}
        >
          {question}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-slate-300" : ""
          }`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? "max-h-48 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm leading-relaxed text-slate-400">{answer}</p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-3xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Preguntas frecuentes
          </h2>
          <p className="mt-3 text-slate-400">
            Todo lo que querés saber antes de empezar
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 md:px-8">
          {faqs.map((faq, index) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() =>
                setOpenIndex(openIndex === index ? -1 : index)
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
