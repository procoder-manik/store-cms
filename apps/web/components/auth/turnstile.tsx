"use client";
import Script from "next/script";

/** Cloudflare Turnstile widget. Adds a hidden "cf-turnstile-response" input to the parent form. */
export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" data-size="flexible" />
    </>
  );
}
