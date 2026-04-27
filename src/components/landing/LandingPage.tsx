import Link from "next/link";
import {
  Clock,
  CheckCircle,
  ArrowRight,
  Bell,
  BarChart3,
  Shield,
} from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { ElProblemaSection } from "@/components/landing/ElProblemaSection";
import { ComoFuncionaSection } from "@/components/landing/ComoFuncionaSection";
import { FuncionalidadesSection } from "@/components/landing/FuncionalidadesSection";
import { ParaQuienEsSection } from "@/components/landing/ParaQuienEsSection";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1623] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f1623]/90 backdrop-blur-md">
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

      {/* Beneficios */}
      <section className="border-t border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              Por qué elegir Turnos
            </h2>
            <p className="mt-3 text-slate-400">
              Todo lo que necesitás para gestionar tu agenda sin fricción
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Clock,
                title: "Agenda en tiempo real",
                description:
                  "Los turnos disponibles se actualizan al instante. Sin doble reservas, sin confusiones.",
              },
              {
                icon: Bell,
                title: "Recordatorios automáticos",
                description:
                  "Reducí las ausencias con notificaciones automáticas antes del turno.",
              },
              {
                icon: BarChart3,
                title: "Panel de estadísticas",
                description:
                  "Seguí la ocupación de tu agenda, los servicios más demandados y las tendencias.",
              },
              {
                icon: Shield,
                title: "Seguro y confiable",
                description:
                  "Los datos de tu empresa y tus clientes están protegidos con los estándares más altos.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] cursor-default"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#1c2a40]">
                  <Icon className="h-5 w-5 text-slate-300" />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist section */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
          <div className="grid gap-12 p-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="mb-4 text-3xl font-bold text-white">
                Todo lo que necesitás,
                <br />
                nada de lo que no usás
              </h2>
              <p className="mb-8 text-slate-400">
                Una plataforma pensada para que cualquier empresa pueda
                digitalizar su agenda sin necesitar conocimientos técnicos ni
                contratar desarrolladores.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#253551] px-5 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-[#2e4166] focus:outline-none focus:ring-2 focus:ring-[#253551]/50 cursor-pointer"
              >
                Empezar ahora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="space-y-4">
              {[
                "Configuración en menos de 5 minutos",
                "Link de reserva único por empresa",
                "Panel de administración centralizado",
                "Gestión de múltiples servicios y profesionales",
                "Historial completo de turnos",
                "Sin contratos ni costos ocultos",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <span className="text-sm text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Empezá hoy, gratis.
          </h2>
          <p className="mb-10 text-lg text-slate-400">
            Registrá tu empresa en minutos y empezá a recibir reservas.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-[#0f1623] transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
          >
            Registrarme
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-4 text-sm text-slate-600">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="text-slate-400 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Iniciá sesión
            </Link>
          </p>
        </div>
      </section>

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
