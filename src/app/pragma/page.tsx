"use client";

import { useEffect, useState, useCallback } from "react";

interface Company {
  id: string;
  name: string;
  slug: string;
  rubro: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
  serviceProvider: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    createdAt: string;
  };
}

type View = "loading" | "login" | "setup" | "panel";

export default function PragmaPage() {
  const [view, setView] = useState<View>("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/pragma/auth");
    const data = await res.json();
    if (data.authenticated) {
      setView("panel");
      fetchCompanies();
    } else if (!data.passwordSet) {
      setView("setup");
    } else {
      setView("login");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function fetchCompanies() {
    const res = await fetch("/api/pragma/companies");
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/pragma/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al autenticar");
      } else {
        setPassword("");
        setView("panel");
        fetchCompanies();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(serviceProviderId: string) {
    setToggling(serviceProviderId);
    try {
      const res = await fetch(`/api/pragma/companies/${serviceProviderId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies((prev) =>
          prev.map((c) =>
            c.serviceProvider.id === serviceProviderId
              ? {
                  ...c,
                  serviceProvider: { ...c.serviceProvider, isActive: data.isActive },
                }
              : c
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/pragma/auth", { method: "DELETE" });
    setCompanies([]);
    setView("login");
  }

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.serviceProvider.email.toLowerCase().includes(q) ||
      c.rubro.toLowerCase().includes(q) ||
      c.serviceProvider.name.toLowerCase().includes(q)
    );
  });

  if (view === "loading") {
    return (
      <div className="min-h-screen bg-[#0f1623] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "setup" || view === "login") {
    const isSetup = view === "setup";
    return (
      <div className="min-h-screen bg-[#0f1623] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white px-8 py-10 shadow-xl">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#253551]">
                <span className="text-xl font-bold text-white">P</span>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {isSetup ? "Panel Pragma" : "Panel Pragma"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {isSetup
                  ? "Primera vez — definí tu contraseña de acceso"
                  : "Ingresá tu contraseña para continuar"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSetup ? "Creá tu contraseña" : "••••••••"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#253551] focus:outline-none focus:ring-2 focus:ring-[#253551]/20"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !password}
                className="w-full rounded-lg bg-[#253551] py-2.5 text-sm font-medium text-white hover:bg-[#1c2a40] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Verificando..." : isSetup ? "Crear contraseña y entrar" : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = companies.filter((c) => c.serviceProvider.isActive).length;
  const inactiveCount = companies.length - activeCount;

  return (
    <div className="min-h-screen bg-[#0f1623]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0f1623]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#253551]">
              <span className="text-sm font-bold text-white">P</span>
            </div>
            <span className="text-white font-semibold">Panel Pragma</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <p className="text-sm text-white/50">Total empresas</p>
            <p className="text-3xl font-bold text-white mt-1">{companies.length}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <p className="text-sm text-white/50">Activas</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">{activeCount}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <p className="text-sm text-white/50">Inactivas</p>
            <p className="text-3xl font-bold text-red-400 mt-1">{inactiveCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, email, rubro..."
            className="w-full max-w-sm rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/50 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Propietario</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Rubro</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Teléfono</th>
                <th className="text-left px-4 py-3 text-white/50 font-medium">Registro</th>
                <th className="text-center px-4 py-3 text-white/50 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/30">
                    {search ? "Sin resultados para esa búsqueda" : "No hay empresas registradas"}
                  </td>
                </tr>
              )}
              {filtered.map((company) => {
                const isActive = company.serviceProvider.isActive;
                const isTogglingThis = toggling === company.serviceProvider.id;
                return (
                  <tr key={company.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{company.name}</p>
                        <p className="text-white/40 text-xs">/{company.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white/80">{company.serviceProvider.name}</p>
                        <p className="text-white/40 text-xs">{company.serviceProvider.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{company.rubro}</td>
                    <td className="px-4 py-3 text-white/60">{company.phone || "—"}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {new Date(company.createdAt).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(company.serviceProvider.id)}
                        disabled={isTogglingThis}
                        title={isActive ? "Click para desactivar" : "Click para activar"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                          isActive ? "bg-emerald-500" : "bg-white/20"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
