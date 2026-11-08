import { requireStaff } from "@/lib/auth/rbac";
import { ManualOrder } from "./manual-order";

export const metadata = { title: "Create order" };

export default async function NewOrderPage() {
  await requireStaff("orders.create");
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="headline text-[28px]">Create order</h1>
      <p className="mt-1 text-[14px] text-fg-muted">For phone, Facebook or WhatsApp orders. Stock and prices are checked the same way as the store.</p>
      <ManualOrder />
    </div>
  );
}
