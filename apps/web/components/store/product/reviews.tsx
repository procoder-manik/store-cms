"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck, Star } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { askQuestionAction, submitReviewAction } from "@/lib/store/actions";

type Review = { id: string; rating: number; title: string | null; body: string | null; is_verified: boolean; admin_reply: string | null; created_at: string; profiles: { full_name: string | null } | null };
type Question = { id: string; question: string; answer: string | null };

export function Reviews({ productId, slug, rating, count, reviews, questions }: {
  productId: string; slug: string; rating: number; count: number; reviews: Review[]; questions: Question[];
}) {
  const t = useTranslations("product");
  const toast = useToast();
  const router = useRouter();
  const [writing, setWriting] = useState(false);
  const [stars, setStars] = useState(5);
  const [pending, start] = useTransition();
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  const needLogin = (err: string) => { if (err === "login") { toast(t("loginNeeded"), "error"); router.push(`/login?next=/product/${slug}`); return true; } return false; };

  return (
    <div className="grid gap-10 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div id="reviews">
        <h2 className="headline text-[26px]">{t("reviews")}</h2>
        <div className="mt-4 flex items-end gap-3">
          <span className="text-[48px] font-semibold leading-none tracking-tight">{count ? rating.toFixed(1) : "0"}</span>
          <div className="pb-1">
            <div className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-4 w-4", i <= Math.round(rating) ? "fill-warning text-warning" : "text-fg-subtle")} />)}</div>
            <p className="text-[13px] text-fg-muted">{count}</p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {dist.map(({ n, c }) => (
            <div key={n} className="flex items-center gap-2 text-[12px] text-fg-muted">
              <span className="w-3">{n}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill"><span className="block h-full bg-warning" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} /></span>
            </div>
          ))}
        </div>
        <Button variant="secondary" className="mt-5 w-full" onClick={() => setWriting((w) => !w)}>{t("writeReview")}</Button>
        {writing && (
          <form className="mt-4 space-y-3" onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            start(async () => {
              const r = await submitReviewAction({ product_id: productId, rating: stars, title: String(f.get("title") ?? ""), body: String(f.get("body") ?? "") });
              if (!r.ok) { if (!needLogin(r.error)) toast(r.error, "error"); return; }
              toast(t("reviewThanks")); setWriting(false);
            });
          }}>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i}`} onClick={() => setStars(i)}>
                  <Star className={cn("h-7 w-7", i <= stars ? "fill-warning text-warning" : "text-fg-subtle")} />
                </button>
              ))}
            </div>
            <Input name="title" placeholder={t("reviewTitle")} />
            <Textarea name="body" placeholder={t("reviewBody")} required minLength={5} />
            <Button type="submit" disabled={pending} className="w-full">{t("submitReview")}</Button>
          </form>
        )}
      </div>

      <div className="space-y-10">
        <ul className="space-y-6">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-line pb-6 last:border-0">
              <div className="flex items-center gap-2">
                <div className="flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={cn("h-3.5 w-3.5", i <= r.rating ? "fill-warning text-warning" : "text-fg-subtle")} />)}</div>
                {r.is_verified && <span className="flex items-center gap-1 text-[12px] text-success"><BadgeCheck className="h-3.5 w-3.5" />{t("verified")}</span>}
              </div>
              {r.title && <p className="mt-2 font-medium">{r.title}</p>}
              {r.body && <p className="mt-1 text-[15px] leading-relaxed text-fg-muted">{r.body}</p>}
              <p className="mt-2 text-[12px] text-fg-subtle">{r.profiles?.full_name ?? "Customer"} · {new Date(r.created_at).toLocaleDateString("en-GB")}</p>
              {r.admin_reply && <p className="mt-3 rounded-[12px] bg-fill p-3 text-[14px]">{r.admin_reply}</p>}
            </li>
          ))}
          {!reviews.length && <li className="text-fg-muted">{t("noReviews")}</li>}
        </ul>

        <div>
          <h3 className="text-[19px] font-semibold">{t("questions")}</h3>
          <form className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap" onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const q = String(new FormData(form).get("q") ?? "");
            start(async () => {
              const r = await askQuestionAction(productId, q);
              if (!r.ok) { if (!needLogin(r.error)) toast(r.error, "error"); return; }
              toast(t("askThanks")); form.reset();
            });
          }}>
            <Input name="q" placeholder={t("askPlaceholder")} minLength={5} required className="min-w-0 flex-1" />
            <Button type="submit" variant="secondary" disabled={pending}>{t("askSubmit")}</Button>
          </form>
          <ul className="mt-4 space-y-4">
            {questions.map((q) => (
              <li key={q.id}>
                <p className="font-medium">{q.question}</p>
                {q.answer && <p className="mt-1 text-[14px] text-fg-muted"><span className="font-medium text-fg">{t("answer")}: </span>{q.answer}</p>}
              </li>
            ))}
            {!questions.length && <li className="text-[14px] text-fg-muted">{t("noQuestions")}</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
