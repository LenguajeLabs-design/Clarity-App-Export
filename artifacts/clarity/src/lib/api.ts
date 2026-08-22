const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

function normalizeBaseUrl(value: string): string {
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const apiBaseUrl = normalizeBaseUrl(rawApiBaseUrl);

export function getApiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API path must start with "/": ${path}`);
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}
