import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0f1623] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white px-8 py-10 shadow-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#253551]">
              <span className="text-lg font-bold text-white">T</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">Bienvenido</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ingresá con tu cuenta para continuar
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-slate-500">
            ¿No tenés cuenta?{" "}
            <a href="/register" className="font-medium text-[#253551] hover:text-[#1c2a40]">
              Registrate
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
