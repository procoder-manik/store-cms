"use client";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, Film, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useUpload } from "./use-upload";
import { deleteMediaAction, listMediaAction, updateMediaAltAction, type MediaItem } from "@/app/admin/(shell)/media/actions";

type Kind = "all" | "image" | "video";

/** Grid of uploaded media with upload, filter, alt text editing and delete. In picker mode it returns selections. */
export function MediaLibrary({ mode = "manage", onSelect, kind: initialKind = "all", folder = "uploads", multiple = true }: {
  mode?: "manage" | "pick"; onSelect?: (items: MediaItem[]) => void; kind?: Kind; folder?: string; multiple?: boolean;
}) {
  const toast = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState<Kind>(initialKind);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<MediaItem[]>([]);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, progress } = useUpload(folder);

  const load = useCallback((p = 1) => {
    start(async () => {
      const r = await listMediaAction({ page: p, kind, q: q || undefined });
      setItems((prev) => (p === 1 ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setPage(p);
    });
  }, [kind, q]);

  useEffect(() => { load(1); }, [load]);

  async function handleFiles(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    const { items: added, errors } = await upload(files);
    if (added.length) {
      setItems((s) => [...added, ...s]);
      toast(`${added.length} file(s) uploaded`);
      if (mode === "pick") setSelected((s) => (multiple ? [...added, ...s] : added.slice(0, 1)));
    }
    errors.forEach((e) => toast(e, "error"));
  }

  const toggle = (m: MediaItem) => {
    if (mode !== "pick") return setEditing(m);
    setSelected((s) => (s.some((x) => x.id === m.id) ? s.filter((x) => x.id !== m.id) : multiple ? [...s, m] : [m]));
  };

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      className={cn("rounded-[20px] transition-shadow", dragOver && "ring-2 ring-accent")}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-fill p-0.5">
          {(["all", "image", "video"] as Kind[]).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={cn("h-8 rounded-full px-3.5 text-[13px] capitalize", kind === k ? "bg-surface font-medium shadow-card" : "text-fg-muted")}>
              {k === "all" ? "All" : k === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by alt text" className="h-9 max-w-56" />
        <input ref={fileRef} type="file" multiple={multiple} accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm"
          className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
        <Button size="sm" className="ml-auto" onClick={() => fileRef.current?.click()} disabled={!!progress}>
          <Upload className="h-4 w-4" />{progress ? `Uploading ${progress.done}/${progress.total}` : "Upload"}
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-fg-subtle">Drag files here. Images up to 10 MB, videos up to 100 MB (50 MB on Supabase storage).</p>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((m) => {
          const isSel = selected.some((s) => s.id === m.id);
          return (
            <button key={m.id} onClick={() => toggle(m)} title={m.alt ?? ""}
              className={cn("relative aspect-square overflow-hidden rounded-[14px] bg-fill text-left", isSel && "ring-2 ring-accent ring-offset-2 ring-offset-[var(--surface)]")}>
              {m.mime.startsWith("video/") ? (
                <>
                  <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
                  <Film className="absolute bottom-2 left-2 h-4 w-4 text-white drop-shadow" />
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumbnail_url ?? m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-cover" />
              )}
              {isSel && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-contrast"><Check className="h-4 w-4" /></span>}
            </button>
          );
        })}
      </div>
      {!items.length && !pending && <p className="py-12 text-center text-[14px] text-fg-muted">No files yet. Upload your first image or video.</p>}
      {items.length < total && (
        <div className="mt-4 text-center"><Button variant="secondary" size="sm" onClick={() => load(page + 1)} disabled={pending}>Load more</Button></div>
      )}

      {mode === "pick" && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 border-t border-line bg-[var(--surface-glass)] py-3 backdrop-blur">
          <span className="text-[13px] text-fg-muted">{selected.length} selected</span>
          <Button disabled={!selected.length} onClick={() => onSelect?.(selected)}>Use selected</Button>
        </div>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="File details">
        {editing && (
          <div className="space-y-4">
            {editing.mime.startsWith("video/")
              ? <video src={editing.url} controls className="w-full rounded-[14px]" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={editing.url} alt={editing.alt ?? ""} className="max-h-72 w-full rounded-[14px] object-contain" />}
            <p className="text-[12px] text-fg-muted">{editing.width && `${editing.width}×${editing.height} · `}{(editing.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
            <Input defaultValue={editing.alt ?? ""} placeholder="Describe the image for search engines and screen readers"
              onBlur={async (e) => { const r = await updateMediaAltAction(editing.id, e.target.value); if (r.ok) { toast("Alt text saved"); setItems((s) => s.map((x) => x.id === editing.id ? { ...x, alt: e.target.value } : x)); } }} />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(editing.url); toast("URL copied"); }}>Copy URL</Button>
              <Button variant="ghost" className="ml-auto text-danger" onClick={async () => {
                if (!confirm("Delete this file permanently?")) return;
                const r = await deleteMediaAction(editing.id);
                if (!r.ok) return toast(r.error, "error");
                setItems((s) => s.filter((x) => x.id !== editing.id));
                setEditing(null);
                toast("Deleted");
              }}><Trash2 className="h-4 w-4" />Delete</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

/** Dialog wrapper for choosing media from anywhere in Admin. */
export function MediaPicker({ open, onClose, onSelect, kind = "all", multiple = true, folder = "products" }: {
  open: boolean; onClose: () => void; onSelect: (items: MediaItem[]) => void; kind?: Kind; multiple?: boolean; folder?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Choose media" className="md:max-w-4xl">
      {open && <MediaLibrary mode="pick" kind={kind} multiple={multiple} folder={folder} onSelect={(items) => { onSelect(items); onClose(); }} />}
    </Dialog>
  );
}
