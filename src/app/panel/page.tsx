import { auth } from "@/auth";
import { db } from "@/lib/db";
import RescheduleBanner from "@/components/panel/RescheduleBanner";

export default async function PanelPage() {
  const session = await auth();

  let rescheduleCount = 0;

  if (session?.user?.id) {
    rescheduleCount = await db.booking.count({
      where: {
        status: "requires_reschedule",
        appointment: {
          serviceProviderId: session.user.id,
        },
      },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl text-[#253551]">Panel</h1>
      <RescheduleBanner count={rescheduleCount} />
    </div>
  );
}
