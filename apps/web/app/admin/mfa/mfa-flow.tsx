"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

type Mode = "loading" | "enroll" | "challenge";

/** Enrols a TOTP authenticator on first use, then asks for a 6-digit code on every sign-in. */
export function MfaFlow() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMode("challenge");
        return;
      }
      // Clean up half-finished enrolments, then start a new one.
      for (const f of data?.all ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: en, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Admin ${Date.now()}` });
      if (error || !en) return setError("Could not start 2FA setup. Enable MFA (TOTP) in Supabase Auth settings.");
      setFactorId(en.id);
      setQr(en.totp.qr_code);
      setSecret(en.totp.secret);
      setMode("enroll");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
    if (chErr || !ch) {
      setPending(false);
      return setError("Could not create a challenge. Try again.");
    }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code: code.trim() });
    setPending(false);
    if (error) return setError("That code is not right. Check the time on your phone and try again.");
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="glass relative w-full max-w-sm rounded-[var(--radius-sheet)] p-7 shadow-float">
      <h1 className="headline text-[24px]">{mode === "enroll" ? "Set up two-factor sign-in" : "Enter your 6-digit code"}</h1>
      {mode === "loading" && <p className="mt-3 text-fg-muted">Loading</p>}
      {mode === "enroll" && (
        <>
          <p className="mt-2 text-[14px] text-fg-muted">Scan this with Google Authenticator, Microsoft Authenticator or 1Password, then enter the code it shows.</p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="2FA QR code" className="mx-auto mt-5 h-44 w-44 rounded-[14px] bg-white p-2" />
          )}
          <p className="mt-3 break-all text-center font-mono text-[12px] text-fg-subtle">{secret}</p>
        </>
      )}
      {mode === "challenge" && <p className="mt-2 text-[14px] text-fg-muted">Open your authenticator app.</p>}
      {mode !== "loading" && (
        <>
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric" autoComplete="one-time-code" placeholder="123456" autoFocus
            className="mt-5 h-14 text-center text-[24px] tracking-[0.4em]" />
          <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || code.length !== 6}>Verify</Button>
        </>
      )}
      {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
    </form>
  );
}
