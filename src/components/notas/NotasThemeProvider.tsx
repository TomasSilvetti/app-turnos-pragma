"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { iniciarSyncOffline } from "@/lib/notas/client";

// Los temas de la app de notas usan las mismas variables CSS que el root, pero
// el fondo del body global es oscuro (#080c14). Sincronizamos el fondo del
// html/body para que al hacer zoom-out no aparezca el fondo negro del layout raíz.
function syncBodyBg(theme: "light" | "dark") {
  const bg = theme === "dark" ? "oklch(0.09 0.025 264)" : "oklch(1 0 0)";
  document.documentElement.style.backgroundColor = bg;
  document.documentElement.style.overflowX = "hidden";
  document.body.style.backgroundColor = bg;
  document.body.style.overflowX = "hidden";
}
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useNotasTheme() {
  return useContext(ThemeContext);
}

export function NotasThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      // Persistir en cookie (1 año) para que el SSR no genere flash en la próxima carga.
      document.cookie = `notas_theme=${next}; path=/; max-age=31536000; samesite=lax`;
      // Propagar el color de fondo al html/body para que no aparezca el fondo
      // oscuro del layout raíz cuando el usuario hace zoom out.
      syncBodyBg(next);
      return next;
    });
  }, []);

  // Registrar el service worker (caché offline + push) y arrancar la sincronización
  // del outbox. Corre una sola vez para toda la app de notas.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    iniciarSyncOffline();
  }, []);

  // Sincronizar al montar también (el body tiene bg oscuro del layout raíz).
  useEffect(() => {
    syncBodyBg(theme);
    return () => {
      document.documentElement.style.backgroundColor = "";
      document.documentElement.style.overflowX = "";
      document.body.style.backgroundColor = "";
      document.body.style.overflowX = "";
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div className={cn("notas-app min-h-screen overflow-x-hidden bg-background text-foreground font-sans", theme === "dark" && "dark")}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
