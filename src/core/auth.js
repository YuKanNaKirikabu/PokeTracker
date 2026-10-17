import { state } from "./state.js";

export async function loadAuth() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();
  state.user = data.authenticated ? { username: data.username } : null;
  return state.user;
}

export async function authenticate(endpoint, username, password) {
  const response = await fetch(`/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || data.detail || "Authentication failed.");
  }
  state.user = { username: data.username };
  return state.user;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  state.user = null;
  state.owned = new Set();
  state.wishlist = new Set();
}
