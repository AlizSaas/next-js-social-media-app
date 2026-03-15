"use server";

import { auth } from "@/lib/auth";
import { resetPasswordSchema, ResetPasswordValues } from "@/lib/validation";
import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

export async function resetPassword(
  values: ResetPasswordValues & { token: string },
): Promise<{ error?: string; success?: boolean }> {
  try {
    const { password } = resetPasswordSchema.parse(values);

    await auth.api.resetPassword({
      body: {
        newPassword: password,
        token: values.token,
      },
      headers: await headers(),
    });

    return redirect("/login");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Failed to reset password. The link may have expired.",
    };
  }
}
