"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/** Staff sign-in. After the password, staff are sent to /admin/mfa for the TOTP step. */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") ? "That link is invalid or expired." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError("Email or password is incorrect.");
    const next = params.get("next");
    router.replace(next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="glass relative w-full max-w-sm rounded-[var(--radius-sheet)] p-7 shadow-float">
      <h1 className="headline text-[26px]">Sign in to Admin</h1>
      <p className="mt-1 text-[14px] text-fg-muted">Staff accounts only.</p>
      <div className="mt-6 space-y-3">
        <Input name="email" type="email" required autoComplete="email" placeholder="Email" className="h-12" />
        <Input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="h-12" />
      </div>
      {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
      <Button type="submit" size="lg" className="mt-6 w-full" disabled={pending}>
        {pending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
