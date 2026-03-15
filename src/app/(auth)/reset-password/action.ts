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

    // Find all non-expired tokens for comparison
    const resetTokens = await prisma.passwordResetToken.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    // Verify the token against all valid tokens
    let validToken: (typeof resetTokens)[0] | null = null;
    for (const resetToken of resetTokens) {
      const isValid = await verify(resetToken.tokenHash, token, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });
      if (isValid) {
        validToken = resetToken;
        break;
      }
    }

    if (!validToken) {
      return {
        error: "Invalid or expired reset link. Please request a new one.",
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
        where: { id: validToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: validToken.id },
      }),
      // Invalidate all existing sessions for security
      prisma.session.deleteMany({
        where: { userId: validToken.userId },
      }),
    ]);

    // Create new session for the user
    const session = await lucia.createSession(validToken.userId, {});
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
