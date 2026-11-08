"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn, formatBDT } from "@/lib/utils";
import type { ProductCardData } from "@/lib/data/catalog";
import { useCart } from "../cart/cart-provider";

type Msg = { role: "user" | "assistant"; text: string; products?: ProductCardData[]; error?: boolean };
const VID = "chat_visitor_id";
const SID = "chat_session";

/** iOS Messages style assistant. Answers come from live store data through server tools. */
export function ChatWidget({ name, welcome }: { name: string; welcome: string }) {
  const t = useTranslations("chat");
  const locale = useLocale() as "en" | "bn";
  const { add, buyNow } = useCart();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: welcome }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  function ids() {
    let vid = "";
    try {
      vid = localStorage.getItem(VID) ?? "";
      if (!vid) { vid = crypto.randomUUID(); localStorage.setItem(VID, vid); }
      return { vid, sid: sessionStorage.getItem(SID) };
    } catch { return { vid: vid || crypto.randomUUID(), sid: null }; }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    const { vid, sid } = ids();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, visitorId: vid, sessionId: sid, locale }) });
      const data = await res.json();
      if (data.sessionId) try { sessionStorage.setItem(SID, data.sessionId); } catch { /* ignore */ }
      setMsgs((m) => [...m, data.reply ? { role: "assistant", text: data.reply, products: data.products } : { role: "assistant", text: data.error ?? t("error"), error: true }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: t("error"), error: true }]);
    } finally { setBusy(false); }
  }

  const chips = [t("q1"), t("q2"), t("q3"), t("q4")];

  return (
    <>
      <motion.button onClick={() => setOpen((o) => !o)} aria-label={open ? t("close") : t("open")} whileTap={{ scale: 0.92 }}
        className="fixed bottom-36 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-contrast shadow-float md:bottom-6 md:right-6">
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label={name} initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="glass fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden rounded-[var(--radius-sheet)] shadow-float md:inset-auto md:bottom-24 md:right-6 md:h-[600px] md:w-[400px]">
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-accent-contrast">{name.charAt(0)}</span>
              <div className="flex-1"><p className="text-[15px] font-semibold">{name}</p><p className="text-[12px] text-fg-muted">{t("subtitle")}</p></div>
              <button onClick={() => setOpen(false)} aria-label={t("close")} className="flex h-8 w-8 items-center justify-center rounded-full bg-fill"><X className="h-4 w-4" /></button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                  <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-[20px] px-3.5 py-2 text-[15px] leading-snug",
                    m.role === "user" ? "rounded-br-[6px] bg-accent text-accent-contrast" : "rounded-bl-[6px] bg-surface text-fg shadow-card", m.error && "text-danger")}>{m.text}</div>
                  {m.products && m.products.length > 0 && (
                    <div className="no-scrollbar mt-2 flex w-full gap-2 overflow-x-auto pb-1">
                      {m.products.map((p) => (
                        <div key={p.id} className="w-40 shrink-0 overflow-hidden rounded-[16px] bg-surface shadow-card">
                          <Link href={`/product/${p.slug}`} onClick={() => setOpen(false)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {p.image ? <img src={p.image} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-fill" />}
                            <p className="line-clamp-2 px-2.5 pt-2 text-[13px] leading-snug">{p.title}</p>
                          </Link>
                          <p className="px-2.5 text-[14px] font-semibold">{formatBDT(p.price, locale)}</p>
                          <div className="grid grid-cols-2 gap-1 p-2">
                            {p.hasVariants ? (
                              <Link href={`/product/${p.slug}`} onClick={() => setOpen(false)} className="col-span-2 rounded-full bg-fill py-1.5 text-center text-[12px] font-medium">{t("choose")}</Link>
                            ) : (
                              <>
                                <button onClick={() => add(p.id, null, 1)} disabled={!p.inStock} className="rounded-full bg-fill py-1.5 text-[12px] font-medium disabled:opacity-40">{t("add")}</button>
                                <button onClick={() => { setOpen(false); buyNow({ productId: p.id, variantId: null, quantity: 1, title: p.title, image: p.image, price: p.price }); }} disabled={!p.inStock}
                                  className="rounded-full bg-accent py-1.5 text-[12px] font-medium text-accent-contrast disabled:opacity-40">{t("buy")}</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="flex w-14 gap-1 rounded-[20px] rounded-bl-[6px] bg-surface px-3.5 py-3 shadow-card">{[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: `${d * 120}ms` }} />)}</div>}
              {msgs.length === 1 && !busy && (
                <div className="flex flex-wrap gap-1.5 pt-1">{chips.map((c) => <button key={c} onClick={() => send(c)} className="rounded-full bg-surface px-3 py-1.5 text-[13px] text-accent shadow-card">{c}</button>)}</div>
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-line p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={800} placeholder={t("placeholder")} aria-label={t("placeholder")}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-[20px] bg-fill px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-accent" />
              <button type="submit" disabled={!input.trim() || busy} aria-label={t("send")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
