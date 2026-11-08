"use client";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Friendly error screen for the storefront. Details are logged, never shown to customers. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
      <h1 className="headline text-[30px]">Something went wrong</h1>
      <p className="mt-2 max-w-md text-fg-muted">Please try again. If it keeps happening, contact us and mention code {error.digest ?? "unknown"}.</p>
      <p className="mt-1 max-w-md text-fg-muted">কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>
      <Button className="mt-6" onClick={reset}><RotateCcw className="h-4 w-4" />Try again</Button>
    </main>
  );
}
