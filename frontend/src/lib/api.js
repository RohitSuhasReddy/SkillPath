import React from "react";
export const API_BASE = import.meta.env.VITE_API_URL || "";

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + "/api" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw new Error("The SkillPath API is offline. Start the backend on port 8000 and refresh.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : `Request failed (${response.status}).`);
  }
  return response.json();
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
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage disabled */ }
  }, [key, value]);
  return [value, setValue];
}
