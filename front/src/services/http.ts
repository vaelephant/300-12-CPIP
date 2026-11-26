const DEFAULT_BASE_URL = "http://127.0.0.1:8000/api/v1";
const TOKEN_KEY = "hcc-cip.backend-token";

export const HCC_API_BASE_URL = (import.meta.env.VITE_HCC_API_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, requestId: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

function storageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getBackendToken(): string | null {
  if (!storageAvailable()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setBackendToken(token: string): void {
  if (storageAvailable()) window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearBackendToken(): void {
  if (storageAvailable()) window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  headers.set("X-Request-ID", `web-${crypto.randomUUID().slice(0, 12)}`);
  const token = getBackendToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${HCC_API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401 && token) {
    clearBackendToken();
    if (typeof window !== "undefined") window.dispatchEvent(new Event("hcc:unauthorized"));
  }
  const responseRequestId = response.headers.get("X-Request-ID") ?? "";
  if (!response.ok) {
    let code = "HTTP_ERROR";
    let message = `请求失败（${response.status}）`;
    let details: unknown = [];
    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string; request_id?: string; details?: unknown };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      details = body.error?.details ?? [];
      const requestId = body.error?.request_id ?? responseRequestId;
      throw new ApiError(response.status, code, message, requestId, details);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(response.status, code, message, responseRequestId || "unknown", details);
    }
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
