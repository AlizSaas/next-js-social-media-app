import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { cache } from "react";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true if email verification is required
    sendResetPassword: async ({ user, url }) => {
      // Dynamic import to avoid build-time errors when RESEND_API_KEY is not set
      const { Resend } = await import("resend");
      
      if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY environment variable is not set. Password reset emails cannot be sent.");
      }
      
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@bugbook.app",
        to: user.email,
        subject: "Reset your password",
        html: `
          <h1>Reset your password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${url}">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day (how often to update the session expiry)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    modelName: "User",
    fields: {
      image: "avatarUrl",
    },
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
        input: true,
      },
      displayName: {
        type: "string",
        required: true,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"],
});

// Cached server-side session validation
export const validateRequest = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { user: null, session: null };
  }

  return {
    user: {
      id: session.user.id,
      username: (session.user as { username?: string }).username || "",
      displayName: (session.user as { displayName?: string }).displayName || session.user.name,
      avatarUrl: session.user.image ?? null,
      email: session.user.email,
    },
    session: session.session,
  };
});

// Type exports for use in components
export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string;
};

export type AuthSession = typeof auth.$Infer.Session.session;