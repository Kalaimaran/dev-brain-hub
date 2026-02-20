import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://api.example.com";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
};

export const getAccessToken = () => accessToken;

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refreshToken,
        });
        setTokens(data.accessToken, data.refreshToken || refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post("/api/v1/auth/register", { email, password, name }),
  login: (email: string, password: string) =>
    api.post("/api/v1/auth/login", { email, password }),
  logout: () => api.post("/api/v1/auth/logout"),
};

// Data
export const dataApi = {
  embed: (text: string, metadata?: Record<string, string>) =>
    api.post("/data/embed", { text, metadata }),
  search: (query: string, topK: number = 5, filters?: Record<string, string>) =>
    api.post("/data/search", { query, topK, filters }),
  list: (params?: { namespace?: string; page?: number; limit?: number }) =>
    api.get("/data/list", { params }),
};

// Usage & Logs
export const analyticsApi = {
  usage: () => api.get("/usage"),
  logs: (params?: { page?: number; limit?: number }) =>
    api.get("/logs", { params }),
};

export default api;
