import axios from "axios";

const PROD_API_BASE = "https://data-nexus-541643753386.asia-south1.run.app";
const DEV_API_BASE = "http://localhost:8080";

// ─── Storage keys ────────────────────────────────────────────────────────────
const ACCESS_KEY = "dn_access_token";
const REFRESH_KEY = "dn_refresh_token";
const DEV_MODE_KEY = "dn_developer_mode";

// ─── In-memory mirrors ────────────────────────────────────────────────────────
let _access = localStorage.getItem(ACCESS_KEY);
let _refresh = localStorage.getItem(REFRESH_KEY);
let _developerMode = localStorage.getItem(DEV_MODE_KEY) === "true";

// ─── Public helpers ───────────────────────────────────────────────────────────
export const getAccessToken = () => _access;
export const getRefreshToken = () => _refresh;
export const isDeveloperMode = () => _developerMode;
export const getApiBaseUrl = () => (_developerMode ? DEV_API_BASE : PROD_API_BASE);

export const setTokens = (access, refresh) => {
  _access = access;
  _refresh = refresh;
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  _access = null;
  _refresh = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

export const setDeveloperMode = (enabled) => {
  _developerMode = !!enabled;
  localStorage.setItem(DEV_MODE_KEY, String(_developerMode));
  api.defaults.baseURL = getApiBaseUrl();
};

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: getApiBaseUrl(),
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
        const res = await axios.post(`${getApiBaseUrl()}/api/v1/auth/refresh`, {
          refreshToken: _refresh,
        });
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
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (username, email, password) =>
    api.post("/api/v1/auth/register", { username, email, password }),
  login: (username, password) =>
    api.post("/api/v1/auth/login", { username, password }),
  me: () => api.get("/api/v1/auth/me"),
  updateProfile: (body) => api.put("/api/v1/auth/me", body),
  changePassword: (body) => api.post("/api/v1/auth/me/password", body),
  logout: () => api.post("/api/v1/auth/logout"),
};

// ─── DevBrain — read queries ──────────────────────────────────────────────────
export const brainApi = {
  // Dashboard
  dailySummary: (date) =>
    api.get("/api/events/summary/daily", { params: { date } }),
  rangeSummary: (range) =>
    api.get("/api/events/summary/range", { params: { range } }),

  // Terminal history
  terminal: (params) => api.get("/api/events/terminal", { params }),

  // AI conversations
  conversations: (params) => api.get("/api/events/conversations", { params }),

  // Web activity
  webActivity: (params) => api.get("/api/events/web-activity", { params }),
  webStats: (range) => api.get("/api/events/web-stats", { params: { range } }),

  // Page transcripts
  transcripts: (params) => api.get("/api/events/transcripts", { params }),

  // Global search
  search: (params) => api.get("/api/events/search", { params }),

  // Extension sidebar stats
  stats: () => api.get("/api/events/stats"),

  // Profile — extension/plugin last sync timestamps
  profileSync: () => api.get("/api/events/profile/sync"),

  // Transcript full text by ID
  transcript: (id) => api.get(`/api/events/transcripts/${id}`),
};

// ─── Notes ────────────────────────────────────────────────────────────────────
export const notesApi = {
  list: (params) => api.get("/api/notes", { params }),
  get: (id) => api.get(`/api/notes/${id}`),
  create: (body) => api.post("/api/notes", body),
  update: (id, body) => api.put(`/api/notes/${id}`, body),
  remove: (id) => api.delete(`/api/notes/${id}`),
};

// ─── Issues / KB ──────────────────────────────────────────────────────────────
export const issuesApi = {
  list: (params) => api.get("/api/issues", { params }),
  get: (id) => api.get(`/api/issues/${id}`),
  create: (body) => api.post("/api/issues", body),
  update: (id, body) => api.put(`/api/issues/${id}`, body),
  remove: (id) => api.delete(`/api/issues/${id}`),
};

export default api;
