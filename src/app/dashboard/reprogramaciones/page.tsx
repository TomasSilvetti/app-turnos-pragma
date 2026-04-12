import RescheduleList from "@/components/panel/RescheduleList";

export default function ReprogramacionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-[var(--brand-color)] dark:text-[#93c5fd]">Reprogramaciones</h1>
      <RescheduleList />
    </div>
  );
}
