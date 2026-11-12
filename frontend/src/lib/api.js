import React from "react";
import { offlineRequest } from "./offline.js";

export const API_BASE = import.meta.env.VITE_API_URL || "";
let announcedFallback = false;

/**
 * Use FastAPI when available. If the server isn't running, use an explicitly
 * labelled local-demo engine so basic frontend flows still work with npm run dev.
 * 4xx validation errors are NOT silently turned into demo results.
 */
export async function api(path, options = {}) {
  let response;
  const isRead = !options.method || options.method.toUpperCase() === "GET";
  try {
    response = await fetch(API_BASE + "/api" + path, {
      ...options,
      signal: options.signal || AbortSignal.timeout(isRead ? 3500 : 6000),
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch (error) {
    if (!announcedFallback) {
      console.info("[SkillPath] API unavailable — using the clearly labelled local browser demo.",error);
      announcedFallback = true;
    }
    return offlineRequest(path, options);
  }
  if (!response.ok) {
    if (response.status >= 500) {
      if (!announcedFallback) {
        console.warn("[SkillPath] API error — using the clearly labelled local demo instead.");
        announcedFallback = true;
      }
      return offlineRequest(path, options);
    }
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Request failed (" + response.status + ").");
  }
  const data = await response.json();
  announcedFallback = false;
  return data;
}

export function useStoredState(key, fallback) {
  const [value, setValue] = React.useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : fallback;
    } catch {
      return fallback;
    }
  });
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* browser storage disabled */ }
  }, [key, value]);
  return [value, setValue];
}
