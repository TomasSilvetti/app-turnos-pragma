"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Shirt, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/lavanderia/admin/tablero", label: "Tablero", icon: LayoutGrid },
  { href: "/lavanderia/admin/trabajos", label: "Trabajos", icon: Shirt },
  { href: "/lavanderia/admin/empleados", label: "Empleados", icon: Users },
  { href: "/lavanderia/admin/metricas", label: "Métricas", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border p-2 md:h-[calc(100vh-3.5rem)] md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:p-3">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const activo = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activo ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
