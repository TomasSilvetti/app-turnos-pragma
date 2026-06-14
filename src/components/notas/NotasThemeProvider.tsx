"use client";

import { createContext, useCallback, useContext, useState } from "react";
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
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div className={cn("notas-app min-h-screen bg-background text-foreground font-sans", theme === "dark" && "dark")}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
