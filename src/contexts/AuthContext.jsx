import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { authApi, setTokens, clearTokens, getAccessToken } from "@/lib/api";

// ─── Storage key for user profile ─────────────────────────────────────────────
const USER_KEY = "dn_user";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function saveUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function removeUser() {
  localStorage.removeItem(USER_KEY);
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  // Rehydrate from localStorage on first render
  const [user, setUser] = useState(() => {
    // Only restore if a token also exists — prevents stale user with no token
    return getAccessToken() ? loadUser() : null;
  });

  // Safety-net: if token disappears externally (another tab clears it), log out
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "dn_access_token" && !e.newValue) {
        setUser(null);
        removeUser();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const login = useCallback(async (username, password) => {
    // Response shape: { success, data: { user, accessToken, refreshToken } }
    const response = await authApi.login(username, password);
    const payload = response.data.data;
    setTokens(payload.accessToken, payload.refreshToken);
    saveUser(payload.user);
    setUser(payload.user);
  }, []);

  const register = useCallback(async (username, email, password) => {
    // Response shape: { success, data: { user, accessToken, refreshToken } }
    const response = await authApi.register(username, email, password);
    const payload = response.data.data;
    setTokens(payload.accessToken, payload.refreshToken);
    saveUser(payload.user);
    setUser(payload.user);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    clearTokens();
    removeUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!getAccessToken(),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
