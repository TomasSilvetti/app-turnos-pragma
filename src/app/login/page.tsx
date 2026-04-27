import { LoginForm } from "@/components/auth/LoginForm";
import { Plasma } from "@/components/landing/Plasma";

export default function LoginPage() {
  return (
    <div className="auth-page relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      <Plasma
        speed={0.5}
        color1="#080c14"
        color2="#0d1f3c"
        color3="#1a3a6b"
        color4="#0f2a50"
      />
      <div className="absolute inset-0 bg-[#080c14]/50" />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-[#080c14] border border-white/10 px-8 py-10 shadow-2xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-56 w-56 items-center justify-center">
              <img src="/icon-192.png" alt="Logo" className="h-56 w-56 object-contain drop-shadow-lg" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Bienvenido</h1>
            <p className="mt-1 text-sm text-white/60">
              Ingresá con tu cuenta para continuar
            </p>
          </div>

          <LoginForm />

          <p className="mt-6 text-center text-sm text-white/60">
            ¿No tenés cuenta?{" "}
            <a href="/register" className="font-medium text-white hover:text-white/80 underline underline-offset-2">
              Registrate como empresa
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
