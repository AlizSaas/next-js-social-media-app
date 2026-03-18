"use server";

import { sendPasswordResetEmail } from "@/lib/email";
import prisma from "@/lib/prisma";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/validation";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;

async function checkRateLimit(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // Count recent password reset requests for this email
  const recentRequests = await prisma.passwordResetRateLimit.count({
    where: {
      email: normalizedEmail,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  return recentRequests < MAX_REQUESTS_PER_WINDOW;
}

async function recordRateLimitAttempt(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase();
  
  // Record the attempt
  await prisma.passwordResetRateLimit.create({
    data: {
      email: normalizedEmail,
    },
  });

  // Clean up old rate limit records (older than 1 hour)
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  await prisma.passwordResetRateLimit.deleteMany({
    where: {
      createdAt: {
        lt: windowStart,
      },
    },
  });
}

export async function requestPasswordReset(
  data: ForgotPasswordValues,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const { email } = forgotPasswordSchema.parse(data);

    // Check rate limit before processing
    const withinRateLimit = await checkRateLimit(email);
    if (!withinRateLimit) {
      return {
        error: "Too many password reset requests. Please try again later.",
      };
    }

    // Record this attempt for rate limiting (before any other processing)
    await recordRateLimitAttempt(email);

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

    // Generate token: id (for lookup) + secret (for verification)
    // The id is stored as-is, the secret is hashed
    const tokenId = generateIdFromEntropySize(10); // 16 characters for lookup
    const tokenSecret = generateIdFromEntropySize(25); // 40 characters for verification

    // Hash only the secret portion
    const tokenHash = await hash(tokenSecret, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Store with tokenId as the primary key for direct lookup
    await prisma.passwordResetToken.create({
      data: {
        id: tokenId,
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // Combine tokenId and secret in the URL (tokenId.secret format)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${tokenId}.${tokenSecret}`;

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
