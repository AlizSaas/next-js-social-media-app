import { Metadata } from "next";
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function Page() {
  return (
    <main className="flex h-screen items-center justify-center p-5">
      <div className="flex h-full max-h-[40rem] w-full max-w-[32rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-card p-10 shadow-2xl">
        <div className="w-full space-y-10">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Forgot Password</h1>
            <p className="text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset
              your password.
            </p>
          </div>
          <ForgotPasswordForm />
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
