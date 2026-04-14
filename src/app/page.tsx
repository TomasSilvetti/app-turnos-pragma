import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard/turnos-reservados");
  }

  return <LandingPage />;
}
