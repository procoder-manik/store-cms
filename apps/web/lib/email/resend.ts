import "server-only";
import type { EmailMessage, EmailProvider } from "./types";

/** Resend REST API (free: 3,000 emails/month, 100/day). */
export const resend: EmailProvider = {
  id: "resend",
  async send(m: EmailMessage) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Store <onboarding@resend.dev>", to: [m.to], subject: m.subject, html: m.html, text: m.text,
        reply_to: m.replyTo,
        attachments: m.attachments?.map((a) => ({ filename: a.filename, content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content })),
      }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok || !data.id) throw new Error(data.message ?? `Resend error ${res.status}`);
    return { id: data.id };
  },
};
