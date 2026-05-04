import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'token';
const USER_KEY = 'user';

const loadAuth = () => {
  const token = localStorage.getItem(STORAGE_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  if (!token || !userStr) return { token: null, user: null };
  try {
    return { token, user: JSON.parse(userStr) };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(loadAuth);

  const login = useCallback(async (email, password) => {
    const { data, error } = await api.post('/auth/login', { email, password });
    if (error) return { error };
    const { token, ...user } = data;
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuth({ token, user });
    return { data: user };
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    const { data, error } = await api.post('/auth/register', { name, email, password, role });
    if (error) return { error };
    const { token, ...user } = data;
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuth({ token, user });
    return { data: user };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth({ token: null, user: null });
  }, []);

  const value = useMemo(() => ({
    ...auth,
    isAuthenticated: !!auth.token,
    login,
    register,
    logout,
  }), [auth, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
