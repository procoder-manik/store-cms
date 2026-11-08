"use client";
import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn, formatBDT } from "@/lib/utils";
import type { ImportedInput } from "@/lib/importers/schema";
import { runImportAction } from "../actions";

/** Most images one product can hold (40 media items minus the video). */
const LIMIT = 38;

export function ImportReview({ jobId, product: p, status, productId, categories, suggested, cost, defaultStatus }: {
  jobId: string; product: ImportedInput; status: string; productId: string | null; categories: { id: string; name: string }[];
  suggested: number; cost: number; defaultStatus: "draft" | "published";
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(p.title.slice(0, 200));
  const [price, setPrice] = useState(suggested);
  const [state, setState] = useState<"draft" | "published">(defaultStatus);
  const [cats, setCats] = useState<string[]>([]);
  const [imgs, setImgs] = useState<string[]>(p.images.slice(0, LIMIT));
  const [video, setVideo] = useState(p.videos.length > 0);
  const [descImages, setDescImages] = useState(true);
  const [pending, start] = useTransition();

  const go = () => start(async () => {
    const r = await runImportAction(jobId, { title, price: price !== suggested ? price : null, status: state, categoryIds: cats, includeImages: imgs, includeVideo: video, copyDescriptionImages: descImages });
    if (!r.ok) return toast(r.error, "error");
    toast("Imported. Review the product and publish when ready.");
    router.push(`/admin/products/${r.data!.productId}`);
  });

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/imports" className="flex h-9 w-9 items-center justify-center rounded-full bg-fill" aria-label="Back"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="headline text-[26px]">Review import</h1>
        <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[14px] text-accent">{p.source} <ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
      {status === "imported" && productId && <p className="mt-4 rounded-[14px] bg-success/10 p-3 text-[14px]">Already imported. <Link className="text-accent" href={`/admin/products/${productId}`}>Open product</Link></p>}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card title="Images" description={`Tap a photo to include or skip it. ${imgs.length} of ${p.images.length} selected${p.images.length > LIMIT ? `. A product holds at most ${LIMIT} photos` : ""}. Untick pages ads, logos or unrelated photos.`}
            actions={<div className="flex gap-1"><Button type="button" size="sm" variant="ghost" onClick={() => setImgs(p.images.slice(0, LIMIT))}>Select all</Button><Button type="button" size="sm" variant="ghost" onClick={() => setImgs([])}>Clear</Button></div>}>
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {p.images.map((u) => {
                const on = imgs.includes(u);
                return (
                  <li key={u}>
                    <button type="button" onClick={() => setImgs((s) => (on ? s.filter((x) => x !== u) : s.length < LIMIT ? [...s, u] : s))}
                      className={cn("relative block aspect-square w-full overflow-hidden rounded-[12px] bg-fill", !on && "opacity-35")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-contrast"><Check className="h-3 w-3" /></span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {p.videos[0] && (
              <div className="mt-4 flex items-center gap-4">
                <video src={p.videos[0].url} poster={p.videos[0].poster} className="h-28 rounded-[12px] bg-fill" controls muted />
                <Switch checked={video} onChange={setVideo} label="Include video" />
              </div>
            )}
          </Card>
          {p.options.length > 0 && (
            <Card title="Options" description={`${p.variants.length} variants will be created with their own prices and stock.`}>
              {p.options.map((o) => (
                <div key={o.name} className="mb-3">
                  <p className="text-[13px] font-medium">{o.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">{o.values.map((v) => <span key={v.value} className="rounded-full bg-fill px-3 py-1 text-[12px]">{v.value}</span>)}</div>
                </div>
              ))}
            </Card>
          )}
          {p.specs.length > 0 && (
            <Card title="Specifications">
              <dl className="grid grid-cols-[40%_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
                {p.specs.slice(0, 20).map((s, i) => <Fragment key={i}><dt className="text-fg-muted">{s.label}</dt><dd>{s.value}</dd></Fragment>)}
              </dl>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <Card title="Product">
            <div className="space-y-3">
              <Field label="Title" htmlFor="im-title" hint="Tip: shorten long marketplace titles."><Input id="im-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="Selling price (৳)" htmlFor="im-price" hint={`Source ${p.currency} ${p.price} ≈ ${formatBDT(cost)} before markup. Variants scale with this.`}>
                <Input id="im-price" type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </Field>
              <Field label="Save as" htmlFor="im-status">
                <Select id="im-status" value={state} onChange={(e) => setState(e.target.value as "draft")}><option value="draft">Draft</option><option value="published">Published</option></Select>
              </Field>
              <Switch checked={descImages} onChange={setDescImages} label="Copy description images" />
            </div>
          </Card>
          <Card title="Categories">
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-[10px] px-2 py-1.5 text-[14px] hover:bg-fill">
                  <input type="checkbox" checked={cats.includes(c.id)} onChange={() => setCats((s) => (s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id]))} className="accent-[var(--accent)]" />{c.name}
                </label>
              ))}
            </div>
          </Card>
          <Button size="lg" className="w-full" disabled={pending || !imgs.length || title.length < 2} onClick={go}>
            {pending ? "Copying images and creating product" : "Import product"}
          </Button>
          <p className="text-center text-[12px] text-fg-subtle">Images and video are copied to your own storage. This can take up to a minute.</p>
        </div>
      </div>
    </div>
  );
}
