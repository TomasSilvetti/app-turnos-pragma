"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { pendientes, sincronizar } from "@/lib/notas/offline";

// Muestra el estado de conexión y cuántos cambios quedan por sincronizar.
export function OfflineBadge() {
  const [online, setOnline] = useState(true);
  const [cola, setCola] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);

    const refrescarCola = () => pendientes().then(setCola).catch(() => {});
    refrescarCola();

    const onOnline = () => {
      setOnline(true);
      sincronizar().finally(refrescarCola);
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("notas:outbox-changed", refrescarCola);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("notas:outbox-changed", refrescarCola);
    };
  }, []);

  if (online && cola === 0) return null;

  if (!online) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <CloudOff className="size-3.5" />
        Sin conexión{cola > 0 && ` · ${cola}`}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      <RefreshCw className="size-3.5 animate-spin" />
      Sincronizando {cola}
    </span>
  );
}
