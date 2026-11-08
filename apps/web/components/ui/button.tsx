import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "btn-primary bg-accent text-accent-contrast hover:bg-accent-hover",
  secondary: "glass text-fg hover:bg-fill",
  ghost: "text-fg hover:bg-fill",
  danger: "bg-danger text-white hover:opacity-90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-[17px]",
  icon: "h-10 w-10",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-btn)] font-medium select-none",
    "transition-[background,transform,opacity] duration-200 ease-[var(--ease-spring)] active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    extra,
  );

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <button ref={ref} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = "Button";
