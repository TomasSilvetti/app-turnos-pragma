"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/lavanderia/AdminSidebar";

type Admin = { id: string; nombre: string };

// Rutas publicas del area admin (no requieren sesion): se renderizan sin el shell.
const RUTAS_AUTH = ["/lavanderia/admin/login", "/lavanderia/admin/recuperar-contrasena", "/lavanderia/admin/restablecer-contrasena"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const esRutaAuth = RUTAS_AUTH.some((r) => pathname === r || pathname.startsWith(r + "/"));

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    if (esRutaAuth) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVerificando(false);
      return;
    }
    let cancelado = false;
    fetch("/api/lavanderia/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { admin: Admin } | null) => {
        if (cancelado) return;
        if (d?.admin) setAdmin(d.admin);
        else router.replace("/lavanderia/admin/login");
      })
      .catch(() => {
        if (!cancelado) router.replace("/lavanderia/admin/login");
      })
      .finally(() => !cancelado && setVerificando(false));
    return () => {
      cancelado = true;
    };
  }, [esRutaAuth, router, pathname]);

  const logout = async () => {
    await fetch("/api/lavanderia/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/lavanderia/admin/login");
    router.refresh();
  };

  // Login y recuperacion: sin shell.
  if (esRutaAuth) return <>{children}</>;

  if (verificando || !admin) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    // Shell de alto fijo: sidebar y header del sidebar quedan estáticos y solo
    // el contenido scrollea. En mobile es columna (barra arriba + contenido).
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AdminSidebar adminNombre={admin.nombre} onLogout={logout} />
      <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </div>
  );
}
