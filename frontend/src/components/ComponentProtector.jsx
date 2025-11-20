/**
 * ComponentProtector Component
 * Wrapper for components that require authentication and role-based access
 * Shows component if user has required roles, otherwise renders nothing or fallback
 *
 * Usage:
 * <ComponentProtector requiredRoles={['admin']}>
 *   <AdminOnlyComponent />
 * </ComponentProtector>
 *
 * <ComponentProtector requiredRoles={['technician', 'itsd']}>
 *   <TechSupportPanel />
 * </ComponentProtector>
 *
 * <ComponentProtector
 *   requiredRoles={['admin']}
 *   fallback={<div>Access denied</div>}
 *   showIfUnauthorized={true}
 * >
 *   <SensitiveData />
 * </ComponentProtector>
 */
import React from 'react';
import { useAuth } from '../context/AuthContext';

const ComponentProtector = ({
  children,
  requiredRoles = [],
  fallback = null,
  showIfUnauthorized = false
}) => {
  const { user, isAuthenticated } = useAuth();

  // If not authenticated, show fallback or nothing
  if (!isAuthenticated || !user) {
    return showIfUnauthorized ? fallback : null;
  }

  // If no roles required, show component
  if (requiredRoles.length === 0) {
    return children;
  }

  // Check if user has any of the required roles
  const userRole = user.role?.toLowerCase();
  const hasAccess = requiredRoles.some(role => role.toLowerCase() === userRole);

  // Show component if user has access, otherwise show fallback or nothing
  return hasAccess ? children : (showIfUnauthorized ? fallback : null);
};

export default ComponentProtector;
