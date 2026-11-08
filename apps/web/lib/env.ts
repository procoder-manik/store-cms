import "server-only";
import { z } from "zod";

/**
 * Server-side environment validation. Optional keys belong to later phases;
 * features that need them check for presence at runtime and show a setup hint.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default("Lumen"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  ENCRYPTION_KEY: z.string().min(40, "ENCRYPTION_KEY must be 32 bytes base64"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables. Check .env.local\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
