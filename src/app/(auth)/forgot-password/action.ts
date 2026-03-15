"use server";

import { auth } from "@/lib/auth";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/validation";
import { headers } from "next/headers";

export async function forgotPassword(
  values: ForgotPasswordValues,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const { email } = forgotPasswordSchema.parse(values);

    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: "/reset-password",
      },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    console.error(error);
    // Return success even if email doesn't exist (for security)
    return { success: true };
  }
}
