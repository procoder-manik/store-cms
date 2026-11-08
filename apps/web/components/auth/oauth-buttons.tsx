"use client";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
    </svg>
  );
}

export function OAuthButtons({ next = "/account" }: { next?: string }) {
  const t = useTranslations("auth");
  const go = (provider: "google" | "facebook") =>
    createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}` },
    });
  const cls = "flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-fill text-[15px] font-medium transition-transform active:scale-[0.98]";
  return (
    <div className="space-y-2.5">
      <button type="button" onClick={() => go("google")} className={cls}><GoogleIcon />{t("google")}</button>
      <button type="button" onClick={() => go("facebook")} className={cls}><FacebookIcon />{t("facebook")}</button>
    </div>
  );
}
