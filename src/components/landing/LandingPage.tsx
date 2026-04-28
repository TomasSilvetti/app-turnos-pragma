import { LandingNavbar } from "@/components/landing/LandingNavbar";
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
      <LandingNavbar />

      <HeroSection />

      <ElProblemaSection />

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
