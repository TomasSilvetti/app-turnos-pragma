import { BusinessProfileCreateForm } from "@/components/profile/BusinessProfileCreateForm";

export default function OnboardingPerfilPage() {
  return (
    <div className="min-h-screen bg-[#0f1623] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Configurá tu negocio
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Antes de continuar, completá el perfil de tu negocio.
            </p>
          </div>

          <BusinessProfileCreateForm />
        </div>
      </div>
    </div>
  );
}
