"use client";

const SENSITIVE_QUERY_KEYS = new Set([
  "api_key",
  "token",
  "invite_token",
  "key",
  "license_key",
]);

export interface PostHogConfig {
  key: string;
  host: string;
}

export function getPostHogConfig(
  env: Record<string, string | undefined> = process.env
): PostHogConfig | null {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;

  return {
    key,
    host: env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com",
  };
}

export function sanitizeSensitiveUrl(input: string): string {
  try {
    const parsed = new URL(input);

    for (const key of SENSITIVE_QUERY_KEYS) {
      if (parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, "[REDACTED]");
      }
    }

    return parsed.toString();
  } catch {
    return input;
  }
}
