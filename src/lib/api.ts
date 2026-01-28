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
    return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function clearToken() {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  } catch {}
}

async function request<T = any>(input: string, init?: RequestInit) {
  const url = `${BASE_URL}${input}`;
  const headers = new Headers(init?.headers as HeadersInit);

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...init,
    headers,
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
    err.debug = {
      url,
      method: init?.method || "GET",
      hasAuthHeader: headers.has("Authorization"),
      tokenPresent: Boolean(token),
      status: res.status,
    };

    // ✅ Logout ONLY on 401
    if (typeof window !== "undefined" && res.status === 401) {
      console.warn("AUTH 401 (logout):", err.debug, err.raw);
      clearToken();
      window.location.href = "/login";
    }

    // ✅ 403 is forbidden — NO logout
    if (typeof window !== "undefined" && res.status === 403) {
      console.warn("AUTH 403 (no logout):", err.debug, err.raw);
    }

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
  delete: <T = any>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

export const apiPut = api.put;
export const apiDelete = api.delete;
