/**
 * ProtectedRoute Component
 * Wrapper for routes that require authentication
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles.length > 0 && user) {
    const userRole = user.role?.toLowerCase();
    const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);

    if (!hasAccess) {
      return (
        <div className="container mt-5">
          <div className="alert alert-danger" role="alert">
            <h4 className="alert-heading">Access Denied</h4>
            <p>You do not have permission to access this page.</p>
            <hr />
            <p className="mb-0">Required role: {allowedRoles.join(' or ')}</p>
            <p className="mb-0">Your role: {user.role}</p>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
