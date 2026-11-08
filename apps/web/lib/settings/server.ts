import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt, encrypt } from "@/lib/security/crypto";

/**
 * Settings rows: value = { ...public fields, enc?: "<AES-GCM of JSON secrets>" }.
 * Secrets never leave the server; the admin UI only sees which secrets are set.
 */
export async function getSettingValue<T extends Record<string, unknown>>(key: string): Promise<T> {
  const { data } = await createAdminClient().from("settings").select("value").eq("key", key).maybeSingle();
  return ((data?.value as T) ?? {}) as T;
}

export async function getSecretSetting<P extends Record<string, unknown>, S extends Record<string, string>>(key: string): Promise<{ public: P; secrets: Partial<S> }> {
  const value = await getSettingValue<P & { enc?: string }>(key);
  const { enc, ...pub } = value;
  let secrets: Partial<S> = {};
  if (enc) {
    try { secrets = JSON.parse(decrypt(enc)) as S; } catch { secrets = {}; }
  }
  return { public: pub as unknown as P, secrets };
}

/** Saves public fields; secrets with an empty value keep their previous value. */
export async function saveSetting(key: string, pub: Record<string, unknown>, secrets?: Record<string, string>, actorId?: string) {
  const admin = createAdminClient();
  let enc: string | undefined;
  if (secrets) {
    const current = await getSecretSetting<Record<string, unknown>, Record<string, string>>(key);
    const merged = { ...current.secrets };
    for (const [k, v] of Object.entries(secrets)) if (v && v.trim()) merged[k] = v.trim();
    enc = Object.keys(merged).length ? encrypt(JSON.stringify(merged)) : undefined;
  }
  const value = enc ? { ...pub, enc } : pub;
  await admin.from("settings").upsert({ key, value, is_secret: !!secrets, updated_by: actorId ?? null, updated_at: new Date().toISOString() });
}

/** Names of the secrets that are already stored, for "saved" badges in the UI. */
export async function secretKeysSet(key: string) {
  const { secrets } = await getSecretSetting(key);
  return Object.keys(secrets).filter((k) => !!secrets[k as keyof typeof secrets]);
}
