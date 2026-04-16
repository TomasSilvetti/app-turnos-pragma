"use client";

import { useEffect, useState } from "react";
import { BusinessProfileEditForm } from "@/components/profile/BusinessProfileEditForm";
import { BrandColorPicker } from "@/components/profile/BrandColorPicker";

const DEFAULT_COLOR = "#253551";

export default function DashboardPerfilPage() {
  const [brandColor, setBrandColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    fetch("/api/business-profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.brandColor) setBrandColor(data.brandColor);
      })
      .catch(() => {});
  }, []);

  async function handleBrandColorConfirm(color: string) {
    setBrandColor(color);
    window.dispatchEvent(new CustomEvent("brand-color-change", { detail: color }));
    await fetch("/api/business-profile/brand-color", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandColor: color }),
    });
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="font-heading text-2xl text-[#2A2829] dark:text-[#e2e8f0]">Mi negocio</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Actualizá los datos de tu negocio. Los cambios se reflejan de inmediato en tu link público.
        </p>
      </div>
      <div className="rounded-lg bg-white dark:bg-[#1e293b] border border-[#E0E0DB] dark:border-[#2d3548] p-5 sm:p-8 flex flex-col gap-6">
        <BusinessProfileEditForm />
        <hr className="border-[#E0E0DB]" />
        <BrandColorPicker
          currentColor={brandColor}
          onConfirm={handleBrandColorConfirm}
        />
      </div>
    </div>
  );
}
