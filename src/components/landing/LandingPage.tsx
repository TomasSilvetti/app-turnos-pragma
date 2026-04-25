import Link from "next/link";
import {
  CalendarCheck,
  Building2,
  Users,
  Clock,
  CheckCircle,
  ArrowRight,
  Bell,
  BarChart3,
  Shield,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1623] text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f1623]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#253551]">
              <CalendarCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Turnos</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-slate-300 transition-colors duration-200 hover:bg-white/5 hover:text-white hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#253551] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#2e4166] focus:outline-none focus:ring-2 focus:ring-[#253551]/50 cursor-pointer"
            >
              Registrarme
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#253551]/60 bg-[#253551]/20 px-4 py-1.5 text-sm text-slate-300">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            Gestión profesional de turnos para empresas
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Tus clientes reservan.
            <br />
            <span className="text-slate-400">Vos te enfocás en atender.</span>
          </h1>
          <p className="mb-10 text-lg leading-relaxed text-slate-400 md:text-xl">
            Plataforma de gestión de turnos diseñada para empresas que quieren
            eliminar las filas, reducir las ausencias y darle a sus clientes una
            experiencia de reserva moderna.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-[#0f1623] transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
            >
              Registrarme
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-base font-medium text-slate-300 transition-all duration-200 hover:border-white/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 cursor-pointer"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {[
              { value: "0 filas", label: "de espera para tus clientes" },
              { value: "24/7", label: "disponibilidad para reservar" },
              { value: "-40%", label: "de ausencias con recordatorios" },
              { value: "5 min", label: "para tener tu empresa lista" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-white">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h2 className="text-3xl font-bold text-white md:text-4xl">
            Cómo funciona
          </h2>
          <p className="mt-3 text-slate-400">
            En tres pasos ya estás operativo
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              icon: Building2,
              title: "Registrás tu empresa",
              description:
                "Creás tu cuenta, configurás los datos de tu empresa, los servicios que ofrecés y los horarios de atención.",
            },
            {
              step: "02",
              icon: Users,
              title: "Tus clientes reservan",
              description:
                "Compartís un link único con tus clientes. Ellos eligen el servicio, el día y el horario disponible — sin llamadas, sin intermediarios.",
            },
            {
              step: "03",
              icon: Bell,
              title: "Ambos reciben confirmación",
              description:
                "Tu cliente recibe la confirmación del turno y recordatorios automáticos. Vos ves todo organizado en tu panel de administración.",
            },
          ].map(({ step, icon: Icon, title, description }) => (
            <div
              key={step}
              className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-8 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] cursor-default"
            >
              <p className="mb-4 text-4xl font-bold text-white/10 transition-colors duration-200 group-hover:text-white/20">
                {step}
              </p>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#253551]">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

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
            <CalendarCheck className="h-4 w-4" />
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
