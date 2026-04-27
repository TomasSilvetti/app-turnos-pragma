import Link from "next/link";
import { HeroSection } from "@/components/landing/HeroSection";
import { ElProblemaSection } from "@/components/landing/ElProblemaSection";
import { ComoFuncionaSection } from "@/components/landing/ComoFuncionaSection";
import { FuncionalidadesSection } from "@/components/landing/FuncionalidadesSection";
import { ParaQuienEsSection } from "@/components/landing/ParaQuienEsSection";
import { TestimoniosSection } from "@/components/landing/TestimoniosSection";
import { PreciosSection } from "@/components/landing/PreciosSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTAFinalSection } from "@/components/landing/CTAFinalSection";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#080c14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg tracking-tight text-white">
            <span className="font-bold">pragma</span>
            <span className="font-normal"> turnos</span>
          </span>
          <Link
            href="/login"
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Iniciar sesión
          </Link>
        </div>
      </nav>

      <HeroSection />

      <ElProblemaSection />

      {/* Stats bar */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { value: "0 filas", label: "de espera para tus clientes" },
              { value: "24/7", label: "disponibilidad para reservar" },
              { value: "-40%", label: "de ausencias con recordatorios" },
              { value: "7 min", label: "para tener tu agenda lista" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ComoFuncionaSection />

      <FuncionalidadesSection />

      <ParaQuienEsSection />

      <TestimoniosSection />

      <PreciosSection />

      <FAQSection />

      <CTAFinalSection />

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Turnos</span>
          </div>
          <p className="text-xs text-slate-700">
            © {new Date().getFullYear()} Turnos. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
