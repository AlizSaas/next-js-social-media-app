import { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
};

interface PageProps {
  searchParams: { token?: string };
}

export default function Page({ searchParams }: PageProps) {
  const { token } = searchParams;

  if (!token) {
    return (
      <main className="flex h-screen items-center justify-center p-5">
        <div className="flex h-full max-h-[40rem] w-full max-w-[32rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-card p-10 shadow-2xl">
          <div className="w-full space-y-6 text-center">
            <h1 className="text-3xl font-bold text-destructive">
              Invalid Reset Link
            </h1>
            <p className="text-muted-foreground">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="block text-primary hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen items-center justify-center p-5">
      <div className="flex h-full max-h-[40rem] w-full max-w-[32rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-card p-10 shadow-2xl">
        <div className="w-full space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground">
              Enter your new password below.
            </p>
          </div>
          <ResetPasswordForm token={token} />
          <Link
            href="/login"
            className="block text-center text-sm hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
