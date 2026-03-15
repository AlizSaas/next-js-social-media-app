"use server";

import { sendPasswordResetEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/validation";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";

export async function requestPasswordReset(
  data: ForgotPasswordValues,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const { email } = forgotPasswordSchema.parse(data);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
    });

    // Always return success to prevent email enumeration attacks
    if (!user || !user.passwordHash) {
      // User doesn't exist or uses OAuth only - still return success
      return { success: true };
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a secure token
    const token = generateIdFromEntropySize(25); // 40 characters

    // Hash the token before storing
    const tokenHash = await hash(token, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store the hashed token
    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Generate reset link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send email
    await sendPasswordResetEmail({
      to: email,
      resetLink,
    });

    return { success: true };
  } catch (error) {
    console.error("Password reset request error:", error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}
