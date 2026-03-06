import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";

export default async function AppHome() {
  const profile = await requireProfile();
  if (profile.role === "remover") redirect("/app/remover/jobs");
  redirect("/app/jobs");
}

