"use server";

import { lucia } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resetPasswordSchema, ResetPasswordValues } from "@/lib/validation";
import { hash, verify } from "@node-rs/argon2";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function resetPassword(
  token: string,
  data: ResetPasswordValues,
): Promise<{ error?: string }> {
  try {
    const { password } = resetPasswordSchema.parse(data);

    // Parse the token format: tokenId.tokenSecret
    const [tokenId, tokenSecret] = token.split(".");

    if (!tokenId || !tokenSecret) {
      return {
        error: "Invalid reset link. Please request a new one.",
      };
    }

    // Direct lookup by tokenId - O(1) operation
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (!resetToken) {
      return {
        error: "Invalid or expired reset link. Please request a new one.",
      };
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.passwordResetToken.delete({
        where: { id: tokenId },
      });
      return {
        error: "This reset link has expired. Please request a new one.",
      };
    }

    // Verify the secret portion
    const isValid = await verify(resetToken.tokenHash, tokenSecret, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!isValid) {
      return {
        error: "Invalid reset link. Please request a new one.",
      };
    }

    // Hash the new password
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Update password and delete the used token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      // Invalidate all existing sessions for security
      prisma.session.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    // Create new session for the user
    const session = await lucia.createSession(resetToken.userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );

    return redirect("/");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Password reset error:", error);
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}
