"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useEmpleado } from "@/components/lavanderia/EmpleadoProvider";
import { AdminSidebar } from "@/components/lavanderia/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready, empleadoActivo } = useEmpleado();
  const router = useRouter();

  const sinAcceso = ready && (!empleadoActivo || !empleadoActivo.esAdmin);

  useEffect(() => {
    if (sinAcceso) router.replace("/lavanderia");
  }, [sinAcceso, router]);

  if (!ready || sinAcceso) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="md:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
    </div>
  );
}
