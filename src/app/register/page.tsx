import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0f1623] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Crear cuenta</h1>
            <p className="mt-1 text-sm text-slate-500">
              Completá tus datos para registrarte
            </p>
          </div>

          <RegisterForm
            onSubmit={async (_data) => {
              // Se conectará al backend en porcion-004
              return {};
            }}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Ya tenés cuenta?{" "}
            <a href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
              Iniciá sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
