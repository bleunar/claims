/**
 * AuthContext - JWT Authentication Context
 * Manages user authentication state and JWT tokens
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../utils/api';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);

          // Set auto-logout timer
          setupAutoLogout(storedToken);

          // Verify token with backend
          await checkSession();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear invalid data
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login user with credentials
   */
  const login = async (email, password) => {
    try {
      const response = await api.post('/login', {
        data: { email, password }
      });

      const { access_token, user: userData } = response.data;

      // Store token and user data
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
      setIsAuthenticated(true);

      // Set auto-logout timer
      setupAutoLogout(access_token);

      // Check if user needs onboarding
      const needsUpdate = await checkDefaultCredentials();
      if (needsUpdate) {
        setShowOnboarding(true);
      }

      toast.success('Login successful!');

      return { success: true, user: userData, needsOnboarding: needsUpdate };
    } catch (error) {
      console.error('Login error:', error);

      const errorMessage = error.response?.data?.msg ||
        error.response?.data?.message ||
        'Login failed. Please try again.';

      toast.error(errorMessage);

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      // Call logout endpoint (optional, since JWT is stateless)
      await api.get('/logout').catch(() => {
        // Ignore errors, we're logging out anyway
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Clear state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      toast.info('Logged out successfully');
    }
  };

  /**
   * Setup auto-logout timer based on token expiration
   */
  const setupAutoLogout = (token) => {
    try {
      if (!token) return;

      const decoded = jwtDecode(token);
      if (!decoded.exp) return;

      // Calculate time until expiration in milliseconds
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = decoded.exp - currentTime;

      if (timeUntilExpiry <= 0) {
        // Token already expired
        logout();
        return;
      }

      // Set timer to logout when token expires
      // Subtract 1 second to be safe
      const timeoutMs = (timeUntilExpiry - 1) * 1000;

      // Clear any existing timer
      if (window.authTimer) {
        clearTimeout(window.authTimer);
      }

      window.authTimer = setTimeout(() => {
        console.log("Token expired, auto-logging out...");
        logout();
        toast.info("Session expired. Please login again.");
      }, timeoutMs);

    } catch (error) {
      console.error("Error setting up auto-logout:", error);
    }
  };

  /**
   * Check session validity with backend
   */
  const checkSession = async () => {
    try {
      const response = await api.get('/check_session');

      if (response.data.logged_in && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('Session check error:', error);
      logout();
      return false;
    }
  };

  /**
   * Update user profile locally
   */
  const updateUserProfile = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role) => {
    return user?.role?.toLowerCase() === role.toLowerCase();
  };

  /**
   * Check if user has default admin credentials
   */
  const checkDefaultCredentials = async () => {
    try {
      const response = await api.get('/check_default_credentials');
      return response.data.needs_update || false;
    } catch (error) {
      console.error('Check default credentials error:', error);
      return false;
    }
  };

  /**
   * Complete onboarding process
   */
  const completeOnboarding = () => {
    setShowOnboarding(false);
    logout(); // Force logout to login with new credentials
  };

  const value = {
    user,
    token,
    isAuthenticated,
    loading,
    showOnboarding,
    login,
    logout,
    checkSession,
    updateUserProfile,
    hasRole,
    checkDefaultCredentials,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;
