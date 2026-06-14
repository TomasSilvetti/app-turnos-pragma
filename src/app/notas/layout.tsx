import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NotasThemeProvider } from "@/components/notas/NotasThemeProvider";

export const metadata: Metadata = {
  title: "Notas",
  description: "Notas, recordatorios y progresos",
  // Manifest propio: la PWA instalada abre directo en /notas (no en el dashboard).
  manifest: "/notas.webmanifest",
  appleWebApp: { capable: true, title: "Notas", statusBarStyle: "default" },
};

export default async function NotasLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("notas_theme")?.value === "dark" ? "dark" : "light";

  return <NotasThemeProvider initialTheme={theme}>{children}</NotasThemeProvider>;
}
