"use client";

import LoadingButton from "@/components/LoadingButton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema, ForgotPasswordValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { forgotPassword } from "./action";

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setError(undefined);
    setSuccess(false);
    startTransition(async () => {
      const result = await forgotPassword(values);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-green-600">Check your email</h2>
        <p className="text-muted-foreground">
          If an account exists with that email, we&apos;ve sent you a password reset link.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {error && <p className="text-center text-destructive">{error}</p>}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Enter your email" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton loading={isPending} type="submit" className="w-full">
          Send Reset Link
        </LoadingButton>
      </form>
    </Form>
  );
}
