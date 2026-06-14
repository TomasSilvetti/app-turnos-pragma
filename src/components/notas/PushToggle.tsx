"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotasPush } from "@/hooks/useNotasPush";

export function PushToggle({ deviceReady }: { deviceReady: boolean }) {
  const { activadas, loading, toggle } = useNotasPush(deviceReady);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      disabled={loading || !deviceReady}
      aria-label={activadas ? "Desactivar notificaciones" : "Activar notificaciones"}
      title={activadas ? "Notificaciones activadas" : "Activar notificaciones"}
    >
      {loading ? <Loader2 className="animate-spin" /> : activadas ? <Bell /> : <BellOff />}
    </Button>
  );
}
