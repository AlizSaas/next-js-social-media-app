"use server";

import { auth, validateRequest } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  const { session } = await validateRequest();

  if (!session) {
    throw new Error("Unauthorized");
  }

  await auth.api.signOut({
    headers: await headers(),
  });

  return redirect("/login");
}