"use client";

import Link from "next/link";
import { useState } from "react";

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#080c14]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg tracking-tight text-white">
          <span className="font-bold">pragma</span>
          <span className="font-normal"> turnos</span>
        </span>

        {/* Desktop */}
        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/register"
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-[#080c14] transition-colors duration-200 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Registrarse
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/login"
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
          <button
            onClick={() => setOpen((prev) => !prev)}
            aria-label="Menú"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:bg-white/10"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-white/10 bg-[#080c14]/95 px-6 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="w-full rounded-md bg-white py-2.5 text-center text-sm font-medium text-[#080c14] transition-colors hover:bg-white/90"
            >
              Registrarse
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="w-full rounded-md border border-white/20 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
