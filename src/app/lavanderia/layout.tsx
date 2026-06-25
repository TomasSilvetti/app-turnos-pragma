import type { Metadata } from "next";
import { EmpleadoProvider } from "@/components/lavanderia/EmpleadoProvider";
import { LavNavbar } from "@/components/lavanderia/LavNavbar";

export const metadata: Metadata = {
  title: "Lavandería",
  description: "Tablero de órdenes de trabajo",
  // Manifest propio: la PWA instalada abre directo en /lavanderia.
  manifest: "/lavanderia.webmanifest",
  appleWebApp: { capable: true, title: "Lavandería", statusBarStyle: "default" },
};

export default function LavanderiaLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmpleadoProvider>
      <div className="relative min-h-screen overflow-x-hidden font-sans text-foreground">
        {/* Fondo iOS: degradado suave + halos de color tenues detrás del contenido */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-slate-100 via-sky-50/70 to-slate-100" />
        <div className="pointer-events-none fixed -left-32 -top-32 -z-10 size-[28rem] rounded-full bg-sky-300/25 blur-3xl" />
        <div className="pointer-events-none fixed -right-32 top-1/3 -z-10 size-[28rem] rounded-full bg-violet-300/20 blur-3xl" />
        <LavNavbar />
        <main>{children}</main>
      </div>
    </EmpleadoProvider>
  );
}
