/**
 * Backend wrapper client
 *
 * 用於：
 *   - TGOS MOI（apikey 不能裸露，走後端）
 *   - explode engine（爆炸圖資料）
 *   - 任何需要 service_role 的寫入
 *
 * Supabase reads 不走這層 — 前端直連。
 */

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

class ApiError extends Error {
  constructor(public status: number, public payload: unknown, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseURL}${path}`;
  const resp = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!resp.ok) {
    let payload: unknown = null;
    try {
      payload = await resp.json();
    } catch {
      /* empty */
    }
    throw new ApiError(resp.status, payload, `API ${resp.status} on ${path}`);
  }
  return resp.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
};

export { ApiError };
