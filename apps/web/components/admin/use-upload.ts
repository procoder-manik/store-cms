"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registerMediaAction, type MediaItem } from "@/app/admin/(shell)/media/actions";

function readDimensions(file: File): Promise<{ width: number | null; height: number | null; duration: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (v: { width: number | null; height: number | null; duration: number | null }) => { URL.revokeObjectURL(url); resolve(v); };
    if (file.type.startsWith("image/")) {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight, duration: null });
      img.onerror = () => done({ width: null, height: null, duration: null });
      img.src = url;
    } else {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => done({ width: v.videoWidth || null, height: v.videoHeight || null, duration: Math.round(v.duration) || null });
      v.onerror = () => done({ width: null, height: null, duration: null });
      v.src = url;
    }
  });
}

/** Uploads files straight from the browser to storage, then records them in the media library. */
export function useUpload(folder = "uploads") {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function uploadOne(file: File): Promise<MediaItem> {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size, folder }),
    });
    const target = await res.json();
    if (!res.ok) throw new Error(target.error ?? "Upload failed");

    if (target.driver === "r2") {
      const put = await fetch(target.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Upload to storage failed. Check R2 CORS settings.");
    } else {
      const { error } = await createClient().storage.from("media").uploadToSignedUrl(target.key, target.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);
    }

    const dims = await readDimensions(file);
    const r = await registerMediaAction({
      key: target.key, url: target.publicUrl, mime: file.type, size: file.size, folder,
      alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 200), ...dims,
    });
    if (!r.ok) throw new Error(r.error);
    return r.data!;
  }

  async function upload(files: File[]) {
    setProgress({ done: 0, total: files.length });
    const out: MediaItem[] = [];
    const errors: string[] = [];
    for (const f of files) {
      try { out.push(await uploadOne(f)); } catch (e) { errors.push(`${f.name}: ${e instanceof Error ? e.message : "failed"}`); }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    return { items: out, errors };
  }

  return { upload, progress, uploading: progress !== null };
}
