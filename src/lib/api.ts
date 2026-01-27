// src/lib/api.ts
const BASE_URL = "https://trackmykid-crm-production.up.railway.app";

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const query = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return query ? `?${query}` : "";
}

function getToken(): string {
  try {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function request<T = any>(input: string, init?: RequestInit) {
  const url = `${BASE_URL}${input}`;

  const headers = new Headers(init?.headers as HeadersInit);

  // ✅ Don't set JSON content-type if sending FormData
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  // ✅ Attach token automatically if available
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
    // ✅ For Bearer token APIs across domains, omit credentials
    credentials: "omit",
  });

  const text = await res.text().catch(() => "");
  let data: any = text;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      text ||
      `Request failed: ${res.status}`;

    const err: any = new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );

    err.status = res.status;
    err.raw = data;

    // ✅ Helpful debug for 401/403
    err.debug = {
      url,
      hasAuthHeader: headers.has("Authorization"),
      tokenPresent: Boolean(token),
      status: res.status,
    };

    throw err;
  }

  return data as T;
}

export async function apiGet<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const qs = buildQuery(params);
  return request<T>(`${endpoint}${qs}`, { method: "GET" });
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
  put: <T = any>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(data ?? {}) }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};

export const apiPut = api.put;
export const apiDelete = api.delete;
