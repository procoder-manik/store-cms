import { requireStaff } from "@/lib/auth/rbac";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Media" };

export default async function MediaPage() {
  await requireStaff("media.view");
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="headline text-[28px]">Media</h1>
      <p className="mb-6 mt-1 text-[14px] text-fg-muted">All images and videos used across the store.</p>
      <div className="rounded-[20px] bg-surface p-5 shadow-card"><MediaLibrary /></div>
    </div>
  );
}
