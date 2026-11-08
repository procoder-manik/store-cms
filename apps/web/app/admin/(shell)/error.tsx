"use client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="mx-auto max-w-xl rounded-[20px] bg-surface p-8 text-center shadow-card">
      <h1 className="text-[20px] font-semibold">This page could not load</h1>
      <p className="mt-2 break-words text-[14px] text-fg-muted">{error.message || "Unexpected error"}</p>
      {error.digest && <p className="mt-1 font-mono text-[12px] text-fg-subtle">{error.digest}</p>}
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </div>
  );
}
