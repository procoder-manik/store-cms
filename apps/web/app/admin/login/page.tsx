import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
