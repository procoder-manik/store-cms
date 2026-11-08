import { createElement, type ReactNode } from "react";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { configured } from "@/lib/data/catalog";
import { ScriptRunner, type ScriptDef } from "./script-runner";

export type Slot = "head" | "body_start" | "footer";
export interface CodeRow { head: string; body_start: string; footer: string }

/** Code saved for the whole site (entity "global") or for one page, product, post or category. */
export const getCode = cache(async (entity: string, id: string): Promise<CodeRow | null> => {
  if (!configured()) return null;
  const { data } = await (await createClient()).from("custom_code").select("head,body_start,footer").eq("entity", entity).eq("entity_id", id).maybeSingle();
  return (data as CodeRow | null) ?? null;
});

const attrs = (s: string) => {
  const out: Record<string, string | boolean> = {};
  for (const m of s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    const [, k, a, b, c] = m;
    if (!k || /^on/i.test(k)) continue;
    out[k] = a ?? b ?? c ?? true;
  }
  return out;
};
const reactName = (k: string) => (k === "class" ? "className" : k === "for" ? "htmlFor" : k === "charset" ? "charSet" : k === "crossorigin" ? "crossOrigin" : k === "http-equiv" ? "httpEquiv" : k);

/**
 * Turns pasted code into elements: scripts run through next/script (also on page changes),
 * style, meta and link become real elements, and everything else (iframes, noscript, JSON-LD) is placed as HTML.
 */
export function CodeBlock({ code, slot }: { code: string | null | undefined; slot: Slot }) {
  if (!code?.trim()) return null;
  const scripts: ScriptDef[] = [];
  const nodes: ReactNode[] = [];
  let rest = code;
  let n = 0;
  rest = rest.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (all, a: string, body: string) => {
    const at = attrs(a);
    if (/ld\+json/i.test(String(at.type ?? ""))) return all;
    scripts.push({ id: `code-${slot}-${n++}`, src: typeof at.src === "string" ? at.src : undefined, content: body, async: !!at.async, type: typeof at.type === "string" ? at.type : undefined });
    return "";
  });
  rest = rest.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_a, css: string) => { nodes.push(<style key={`s${n++}`} dangerouslySetInnerHTML={{ __html: css.replace(/<\/style/gi, "") }} />); return ""; });
  if (slot === "head") {
    rest = rest.replace(/<(meta|link)\b([^>]*?)\/?>/gi, (_a, tag: string, a: string) => {
      const props: Record<string, unknown> = { key: `t${n++}` };
      for (const [k, v] of Object.entries(attrs(a))) props[reactName(k)] = v;
      nodes.push(createElement(tag.toLowerCase(), props));
      return "";
    });
  }
  const html = rest.trim();
  return (
    <>
      {nodes}
      {html && <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />}
      {scripts.length > 0 && <ScriptRunner scripts={scripts} />}
    </>
  );
}

export async function EntityCode({ entity, id, slot }: { entity: string; id: string; slot: Slot }) {
  const row = await getCode(entity, id);
  return <CodeBlock code={row?.[slot]} slot={slot} />;
}
