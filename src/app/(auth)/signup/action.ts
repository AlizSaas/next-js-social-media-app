"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import { signUpSchema, SignUpValues } from "@/lib/validation";
import { headers } from "next/headers";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

export async function signUp(
  credentials: SignUpValues,
): Promise<{ error: string }> {
  try {
    const { name, username, email, password } = signUpSchema.parse(credentials);

    // Check if username already exists
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
      },
    });

    if (existingUsername) {
      return {
        error: "Username already taken",
      };
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    if (existingEmail) {
      return {
        error: "Email already taken",
      };
    }

    // Sign up with Better Auth
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        username,
        displayName: name,
      },
      headers: await headers(),
    });

    if (!result || !result.user) {
      return {
        error: "Failed to create account",
      };
    }

    // Create user in Stream for chat
    await streamServerClient.upsertUser({
      id: result.user.id,
      username,
      name,
    });

    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}