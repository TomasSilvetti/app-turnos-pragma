"use client";

import { BusinessProfileEditForm } from "@/components/profile/BusinessProfileEditForm";

export default function DashboardPerfilPage() {
  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-[#2A2829]">Mi negocio</h1>
        <p className="mt-1 text-sm text-slate-500">
          Actualizá los datos de tu negocio. Los cambios se reflejan de inmediato en tu link público.
        </p>
      </div>
      <div className="rounded-lg bg-white border border-[#E0E0DB] p-5 sm:p-8">
        <BusinessProfileEditForm />
      </div>
    </div>
  );
}
