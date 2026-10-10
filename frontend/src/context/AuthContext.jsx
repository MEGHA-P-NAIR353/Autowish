import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      return token && savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(localStorage.getItem('access_token') && localStorage.getItem('user'));
  });
  const [loading, setLoading] = useState(false);

  // Sync session check & re-hydrate freshest profile data
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (accessToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setIsAuthenticated(true);
        // Silently re-hydrate freshest profile data from backend
        authAPI.getProfile().then((resp) => {
          if (resp?.data) {
            localStorage.setItem('user', JSON.stringify(resp.data));
            setUser(resp.data);
          }
        }).catch(() => {});
      } catch {
        localStorage.removeItem('user');
        setUser(null);
        setIsAuthenticated(false);
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, []);

  // Persist tokens & user from backend response
  const _saveSession = (data) => {
    const { access, refresh, user: backendUser } = data;
    if (access) localStorage.setItem('access_token', access);
    // keep backward compat: some views return "token" (non-JWT)
    if (data.token) localStorage.setItem('access_token', data.token);
    if (refresh) localStorage.setItem('refresh_token', refresh);

    const userObj = backendUser || data.user;
    if (userObj) {
      localStorage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
    }
    setIsAuthenticated(true);
    return userObj;
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      return _saveSession(response.data);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.detail ||
        error?.message ||
        'Invalid credentials';
      throw new Error(message);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return _saveSession(response.data);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.email?.[0] ||
        error?.message ||
        'Registration failed';
      throw new Error(message);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Synchronously update local user state and storage with fresh server data
  const updateUser = useCallback((updatedUser) => {
    if (updatedUser) {
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  }, []);

  // Refresh user profile from backend
  const refreshUser = useCallback(async () => {
    try {
      const resp = await authAPI.getProfile();
      const updatedUser = resp.data;
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      return updatedUser;
    } catch {
      // If profile fetch fails with 401, the interceptor in api.js will handle it
    }
  }, []);

  // Social login stubs (OAuth redirect would be handled server-side in production)
  const googleLogin = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: 99,
          username: 'alex_rivera',
          email: 'alex.rivera@gmail.com',
          first_name: 'Alex',
          last_name: 'Rivera',
          profile: { role: 'free', subscription_plan: 'FREE', email_verified: true },
        };
        const token = 'mock-google-jwt';
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
        setIsAuthenticated(true);
        resolve(mockUser);
      }, 900);
    });
  };

  const microsoftLogin = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockUser = {
          id: 100,
          username: 'jordan_lee',
          email: 'jordan.lee@outlook.com',
          first_name: 'Jordan',
          last_name: 'Lee',
          profile: { role: 'free', subscription_plan: 'FREE', email_verified: true },
        };
        const token = 'mock-ms-jwt';
        localStorage.setItem('access_token', token);
        localStorage.setItem('user', JSON.stringify(mockUser));
        setUser(mockUser);
        setIsAuthenticated(true);
        resolve(mockUser);
      }, 900);
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateUser,
        googleLogin,
        microsoftLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
