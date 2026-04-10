import RescheduleList from "@/components/panel/RescheduleList";

export default function ReprogramacionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-[#253551]">Reprogramaciones</h1>
      <RescheduleList />
    </div>
  );
}
