"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/** Invited staff land here from their invite link to choose a password. */
export default function SetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const valid = pw.length >= 10 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setPending(false);
    if (error) return setError(error.message);
    router.replace("/admin/mfa");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-[var(--radius-sheet)] p-7 shadow-float">
        <h1 className="headline text-[24px]">Welcome to the team</h1>
        <p className="mt-1 text-[14px] text-fg-muted">Choose a password with at least 10 characters, a letter and a number.</p>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" className="mt-5 h-12" placeholder="New password" />
        {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={!valid || pending}>Save and continue</Button>
      </form>
    </main>
  );
}
