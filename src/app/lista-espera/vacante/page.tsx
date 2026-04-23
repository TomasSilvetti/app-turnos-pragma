import { Suspense } from "react";
import VacanteClient from "./VacanteClient";

export default function VacantePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
        <p className="font-body text-sm text-[#2A2829]/50">Cargando...</p>
      </div>
    }>
      <VacanteClient />
    </Suspense>
  );
}
