"use server";

import { auth } from "@/lib/auth";
import { loginSchema, LoginValues } from "@/lib/validation";
import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

export async function login(
  credentials: LoginValues,
): Promise<{ error: string }> {
  try {
    const { email, password } = loginSchema.parse(credentials);

    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });

    if (!result || !result.user) {
      return {
        error: "Incorrect email or password",
      };
    }

    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Incorrect email or password",
    };
  }
}