"use client";
import Script from "next/script";

export interface ScriptDef { id: string; src?: string; content: string; async?: boolean; type?: string }

/** Runs scripts from the custom code boxes after the page is interactive. Re-runs correctly on client-side page changes. */
export function ScriptRunner({ scripts }: { scripts: ScriptDef[] }) {
  return (
    <>
      {scripts.map((s) => s.src
        ? <Script key={s.id} id={s.id} src={s.src} strategy="afterInteractive" {...(s.type ? { type: s.type } : {})} />
        : <Script key={s.id} id={s.id} strategy="afterInteractive" {...(s.type ? { type: s.type } : {})} dangerouslySetInnerHTML={{ __html: s.content }} />)}
    </>
  );
}
