// src/lib/api.ts
const BASE_URL = "https://trackmykid-crm-production.up.railway.app";

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v.toString())}`)
    .join("&");
  return query ? `?${query}` : "";
}

function getToken(): string {
  try {
    return typeof window !== "undefined" ? (localStorage.getItem("token") || "") : "";
  } catch {
    return "";
  }
}

async function request<T = any>(input: string, init?: RequestInit) {
  const url = `${BASE_URL}${input}`;
  const headers = new Headers(init?.headers as HeadersInit);
  // Ensure Content-Type if not multipart
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Attach token automatically if available
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });

  const text = await res.text().catch(() => "");
  // Try parse JSON if possible
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    // Throw a useful error object (message property expected by callers)
    const message = (data && (data.message || data.error)) || text || `Request failed: ${res.status}`;
    const err: any = new Error(typeof message === "string" ? message : JSON.stringify(message));
    (err as any).status = res.status;
    (err as any).raw = data;
    throw err;
  }

  return data as T;
}

export async function apiGet<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
  const qs = buildQuery(params);
  return request<T>(`${endpoint}${qs}`, {
    method: "GET",
  });
}

export async function apiPost<T = any>(endpoint: string, data?: any): Promise<T> {
  return request<T>(endpoint, {
    method: "POST",
    body: JSON.stringify(data ?? {}),
  });
}

export const api = {
  get: apiGet,
  post: apiPost,
  put: (endpoint: string, data?: any) =>
    request(endpoint, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  delete: (endpoint: string) => request(endpoint, { method: "DELETE" }),
};

export const apiPut = api.put;
export const apiDelete = api.delete;
