"use client";

import { BusinessProfileForm } from "@/components/profile/BusinessProfileForm";

export default function PerfilPage() {
  return (
    <main className="min-h-screen bg-[#F4F5F7] px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8">
          <h1 className="font-heading text-2xl text-[#2A2829]">Configurá tu negocio</h1>
          <p className="mt-1 text-sm text-slate-500">
            Completá los datos de tu negocio para que tus clientes puedan encontrarte.
          </p>
        </div>

        <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 sm:p-8">
          <BusinessProfileForm
            onSubmit={async (_data, _logo) => {
              // TODO: conectar con porcion-003 (Back)
              return {};
            }}
          />
        </div>
      </div>
    </main>
  );
}
