"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { X } from "lucide-react";

export function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <X size={24} className="text-red-500" />
        </div>
        <p className="text-sm text-slate-700">
          Link inválido. No se encontró el token de recuperación.
        </p>
        <a
          href="/olvide-mi-contrasena"
          className="mt-2 inline-block rounded-lg bg-[#253551] px-4 py-2 text-sm font-medium text-white hover:bg-[#1c2a40] transition-colors"
        >
          Solicitar nuevo link
        </a>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
