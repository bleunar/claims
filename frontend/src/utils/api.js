/**
 * Axios API Client Configuration
 * Handles all HTTP requests to the backend with JWT authentication
 */
import axios from 'axios';
import { toast } from 'react-toastify';

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For cookies if needed
});

// Request interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.VITE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors globally
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.VITE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.error('[API] Unauthorized - Token invalid or expired');

          // Clear token and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');

          // Show error toast
          toast.error(data.message || 'Session expired. Please login again.');

          // Redirect to login if not already there
          if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
            window.location.href = '/';
          }
          break;

        case 403:
          // Forbidden - insufficient permissions
          console.error('[API] Forbidden - Insufficient permissions');
          toast.error(data.message || 'You do not have permission to perform this action.');
          break;

        case 404:
          // Not found
          console.error('[API] Not Found');
          toast.error(data.message || 'Resource not found.');
          break;

        case 422:
          // Validation error
          console.error('[API] Validation Error', data.errors);
          toast.error(data.message || 'Validation failed. Please check your input.');
          break;

        case 429:
          // Too many requests
          console.error('[API] Rate Limit Exceeded');
          toast.error('Too many requests. Please try again later.');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('[API] Server Error', status);
          toast.error(data.message || 'Server error. Please try again later.');
          break;

        default:
          console.error(`[API] Error ${status}`, data);
          toast.error(data.message || 'An error occurred. Please try again.');
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('[API] No Response', error.request);
      toast.error('Network error. Please check your connection.');
    } else {
      // Something else happened
      console.error('[API] Error', error.message);
      toast.error('An unexpected error occurred.');
    }

    return Promise.reject(error);
  }
);

/**
 * API helper functions
 */

// GET request
export const get = (url, config = {}) => {
  return api.get(url, config);
};

// POST request
export const post = (url, data = {}, config = {}) => {
  return api.post(url, data, config);
};

// PUT request
export const put = (url, data = {}, config = {}) => {
  return api.put(url, data, config);
};

// DELETE request
export const del = (url, config = {}) => {
  return api.delete(url, config);
};

// PATCH request
export const patch = (url, data = {}, config = {}) => {
  return api.patch(url, data, config);
};

// File upload helper
export const uploadFile = (url, formData, method = 'POST', onUploadProgress) => {
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  if (onUploadProgress) {
    config.onUploadProgress = onUploadProgress;
  }

  if (method.toUpperCase() === 'PUT') {
    return api.put(url, formData, config);
  } else {
    return api.post(url, formData, config);
  }
};

export default api;
