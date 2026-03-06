export type StorageMode = "browser" | "kv" | "local";

function isTruthy(value: string | undefined) {
  return value === "1" || value === "true";
}

export function hasKvConfig() {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim(),
  );
}

export function getStorageMode(): StorageMode {
  if (hasKvConfig()) {
    return "kv";
  }

  if (isTruthy(process.env.VERCEL)) {
    return "browser";
  }

  return "local";
}

export function isBrowserStorageMode() {
  return getStorageMode() === "browser";
}
