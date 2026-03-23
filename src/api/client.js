/**
 * API client for Water Demand backend.
 * All consumption values from API are in liters; convert to m³ for display (÷ 1000).
 */
const API_BASE = (import.meta.env.VITE_API_URL || "https://webgis-ryxr.onrender.com").replace(/\/+$/, "");

function getToken() {
  return localStorage.getItem("authToken");
}

function headers(includeAuth = true) {
  const h = { "Content-Type": "application/json" };
  if (includeAuth && getToken()) {
    h.Authorization = `Bearer ${getToken()}`;
  }
  return h;
}

export async function apiFetch(path, options = {}) {
  const base = API_BASE.replace(/\/+$/, "");
  const pathNorm = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${pathNorm}`;
  const useAuth = options.skipAuth !== true;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers(useAuth), ...options?.headers },
  });
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = Array.isArray(err.detail)
      ? err.detail.map((e) => e.msg || JSON.stringify(e)).join(". ")
      : err.detail || res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}

// Auth
export async function login(email, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  return data;
}

export async function register(body) {
  const data = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    skipAuth: true,
  });
  return data;
}

export async function getProfile() {
  return apiFetch("/auth/me");
}

export async function updateProfile(body) {
  return apiFetch("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Parcels (values in liters from API)
export async function getParcels(landUse = "All", skip = 0, limit = 500) {
  const params = new URLSearchParams();
  if (landUse && landUse !== "All") params.set("land_use", landUse);
  params.set("skip", String(skip));
  params.set("limit", String(limit));
  return apiFetch(`/parcels?${params}`);
}

export async function getParcel(parcelId) {
  return apiFetch(`/parcels/${encodeURIComponent(parcelId)}`);
}

/** Create a single parcel. Body: { parcel_id, land_use, population, lat, lng }. */
export async function createParcel(body) {
  return apiFetch("/parcels", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateParcel(parcelId, body) {
  return apiFetch(`/parcels/${encodeURIComponent(parcelId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Upload a parcel dataset file (CSV, JSON, or GeoJSON).
 * replaceAll: if true, replace all existing parcels; else merge/upsert by parcel_id.
 */
export async function uploadParcelDataset(file, replaceAll = false) {
  const base = API_BASE.replace(/\/+$/, "");
  const url = `${base}/parcels/upload?replace_all=${replaceAll}`;
  const form = new FormData();
  form.append("file", file);
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userName");
    window.dispatchEvent(new Event("auth:logout"));
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = err.detail || res.statusText;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return res.json();
}

// Analytics (values in liters)
export async function getSummary(scenario = 90, landUse = null) {
  const params = new URLSearchParams();
  params.set('scenario', String(scenario));
  if (landUse && landUse !== 'All') params.set('land_use', landUse);
  return apiFetch(`/analytics/summary?${params}`);
}

export async function getLandUseBreakdown(landUse = null) {
  const params = new URLSearchParams();
  if (landUse && landUse !== 'All') params.set('land_use', landUse);
  const q = params.toString();
  return apiFetch(q ? `/analytics/land-use?${q}` : '/analytics/land-use');
}

export async function getForecast(growthRate = 2, years = 5, landUse = null) {
  const params = new URLSearchParams();
  params.set('growth_rate', String(growthRate));
  params.set('years', String(years));
  if (landUse && landUse !== 'All') params.set('land_use', landUse);
  return apiFetch(`/analytics/forecast?${params}`);
}

export async function getScenarioComparison() {
  return apiFetch("/analytics/scenario-comparison");
}

/**
 * Chat with the water-demand assistant (OpenAI, domain-bound).
 * Returns { reply }. On 503/502 (not configured or OpenAI error), throws so caller can fall back.
 */
export async function chat(message) {
  const data = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ message: String(message).trim() }),
  });
  return data;
}

/** Convert liters to cubic meters for display */
export function litersToM3(liters) {
  return liters / 1000;
}

/** Format volume for display (m³). Input is always in liters; we convert to m³ (1 m³ = 1000 L). */
export function formatM3(value, decimals = 2) {
  const liters = typeof value === "number" ? value : Number(value) || 0;
  const m3 = liters / 1000;
  if (m3 >= 1e6) return `${(m3 / 1e6).toFixed(decimals)}M m³`;
  if (m3 >= 1e3) return `${(m3 / 1e3).toFixed(decimals)}K m³`;
  return `${m3.toFixed(decimals)} m³`;
}
