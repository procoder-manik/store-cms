import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-[var(--radius-input)] bg-fill px-3.5 text-[15px] text-fg outline-none transition-shadow placeholder:text-fg-subtle focus:ring-2 focus:ring-accent disabled:opacity-60 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(fieldClass, "h-11", className)} {...p} />,
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(fieldClass, "min-h-24 py-3", className)} {...p} />,
);
Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...p }, ref) => <select ref={ref} className={cn(fieldClass, "h-11 appearance-none pr-8", className)} {...p} />,
);
Select.displayName = "Select";

export function Field({ label, htmlFor, error, hint, children, className }: {
  label: string; htmlFor?: string; error?: string; hint?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg-muted">{label}</label>
      {children}
      {error ? <p role="alert" className="text-[12px] text-danger">{error}</p>
        : hint ? <p className="text-[12px] text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

export function Card({ title, description, children, className, actions }: {
  title?: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode;
}) {
  return (
    <section className={cn("rounded-[20px] bg-surface p-5 shadow-card md:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-[17px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
