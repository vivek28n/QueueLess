import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('queueless_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore authenticated session on initial mount
  const checkAuthStatus = useCallback(async () => {
    const storedToken = localStorage.getItem('queueless_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      // Axios interceptor will automatically attach Authorization: Bearer <storedToken>
      const response = await api.get('/auth/me');
      if (response.data?.status === 'success' && response.data?.user) {
        setUser(response.data.user);
        setToken(storedToken);
      } else {
        throw new Error('Failed to resolve authenticated session');
      }
    } catch (err) {
      console.warn('[Auth] Session validation failed or token expired:', err.message);
      localStorage.removeItem('queueless_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Login handler
  const login = async ({ email, password, role }) => {
    setAuthError(null);
    try {
      const response = await api.post('/auth/login', { email, password, role });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('queueless_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const errorMessage = err.message || 'Login failed. Please check your credentials.';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Register handler (creates business + primary admin)
  const register = async ({ businessName, adminName, email, password, industry }) => {
    setAuthError(null);
    try {
      const response = await api.post('/auth/register', {
        businessName,
        adminName,
        email,
        password,
        industry,
      });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('queueless_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);

      return { success: true, user: receivedUser };
    } catch (err) {
      const errorMessage = err.message || 'Registration failed. Please try again.';
      setAuthError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('queueless_token');
    setUser(null);
    setToken(null);
    setAuthError(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authError,
    login,
    register,
    logout,
    refreshSession: checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
