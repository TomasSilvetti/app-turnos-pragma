"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotasTheme } from "./NotasThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useNotasTheme();
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
