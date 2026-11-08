import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Lumen";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <Link href="/" className="relative mb-8 text-[22px] font-semibold tracking-tight">{siteName}</Link>
      <div className="glass relative w-full max-w-[400px] rounded-[var(--radius-sheet)] p-6 shadow-float md:p-8">{children}</div>
    </div>
  );
}
