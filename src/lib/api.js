import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ─── Storage keys ────────────────────────────────────────────────────────────
const ACCESS_KEY  = "dn_access_token";
const REFRESH_KEY = "dn_refresh_token";

// ─── In-memory mirrors (so we don't hit localStorage on every request) ───────
let _access  = localStorage.getItem(ACCESS_KEY);
let _refresh = localStorage.getItem(REFRESH_KEY);

// ─── Public helpers ───────────────────────────────────────────────────────────
export const getAccessToken  = () => _access;
export const getRefreshToken = () => _refresh;

export const setTokens = (access, refresh) => {
  _access  = access;
  _refresh = refresh;
  localStorage.setItem(ACCESS_KEY,  access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  _access  = null;
  _refresh = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (_access) config.headers.Authorization = `Bearer ${_access}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && _refresh) {
      original._retry = true;
      try {
        const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refreshToken: _refresh,
        });
        // Response shape: { success, data: { accessToken, refreshToken, ... } }
        const payload = res.data?.data ?? res.data;
        setTokens(payload.accessToken, payload.refreshToken ?? _refresh);
        original.headers.Authorization = `Bearer ${payload.accessToken}`;
        return api(original);
      } catch {
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── API modules ──────────────────────────────────────────────────────────────
export const authApi = {
  register: (username, email, password) =>
    api.post("/api/v1/auth/register", { username, email, password }),
  login: (username, password) =>
    api.post("/api/v1/auth/login", { username, password }),
  logout: () => api.post("/api/v1/auth/logout"),
};

export const dataApi = {
  embed: (input) =>
    api.post("/api/train/embed", { input }),
  search: (input, topK = 5) =>
    api.post("/api/train/search", { input, topK }),
  list: (params) =>
    api.get("/api/train/list", { params }),
};

export const providerApi = {
  summary: (days = 30) => api.get("/api/train/monitoring/summary", { params: { days } }),
  daily:   (days = 30) => api.get("/api/train/monitoring/daily",   { params: { days } }),
  logs:    (params)     => api.get("/api/train/monitoring/logs",    { params }),
  byType:  (days = 30) => api.get("/api/train/monitoring/by-type", { params: { days } }),
  similarityMatrix: (limit = 30) => api.get("/api/train/similarity-matrix", { params: { limit } }),
};

export default api;
