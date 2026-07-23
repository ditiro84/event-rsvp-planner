import axios from "axios";

// In dev, Vite proxies /api to the backend (see vite.config.ts). In production,
// VITE_API_URL should point at the deployed API origin (see .env.example).
const baseURL = import.meta.env.VITE_API_URL || "/api";

// Exported so callers can build direct (non-axios) links to public API
// resources -- e.g. an <a>/<img> pointing at a publicly-servable file --
// without duplicating the VITE_API_URL fallback logic.
export const apiBaseUrl = baseURL;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

let authToken: string | null = null;

// We primarily rely on the httpOnly session cookie, but also keep a copy of
// the bearer token in memory as a fallback for cross-site dev setups where
// third-party cookies may be blocked.
export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function loadStoredAuthToken() {
  authToken = localStorage.getItem("auth_token");
  return authToken;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: ApiError } | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.message) return err.message;
  }
  return "Something went wrong. Please try again.";
}
