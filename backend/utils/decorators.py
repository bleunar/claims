"""
Decorators for CLAIMS backend.
Provides JWT authentication and role-based access control decorators.
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from services.logger import get_logger

logger = get_logger(__name__)


def jwt_required_custom(fn):
    """
    Decorator to require JWT authentication for endpoints.
    Wraps flask_jwt_extended's jwt_required with custom error handling.
    
    Usage:
        @jwt_required_custom
        def protected_route():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return fn(*args, **kwargs)
        except Exception as e:
            logger.warning(f'JWT verification failed: {str(e)}')
            return jsonify({
                "success": False,
                "message": "Authentication required",
                "error": str(e)
            }), 401
    return wrapper


def admin_required(fn):
    """
    Decorator to require admin role for endpoints.
    Must be used after @jwt_required_custom.
    
    Usage:
        @jwt_required_custom
        @admin_required
        def admin_only_route():
            ...
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get('role', '')
            
            if user_role != 'admin':
                logger.warning(f'Admin access denied for user with role: {user_role}')
                return jsonify({
                    "success": False,
                    "message": "Admin access required"
                }), 403
            
            return fn(*args, **kwargs)
        except Exception as e:
            logger.error(f'Admin check failed: {str(e)}')
            return jsonify({
                "success": False,
                "message": "Access denied",
                "error": str(e)
            }), 403
    return wrapper


def role_required(*allowed_roles):
    """
    Decorator to require specific roles for endpoints.
    Must be used after @jwt_required_custom.
    
    Args:
        *allowed_roles: Variable number of allowed role strings
    
    Usage:
        @jwt_required_custom
        @role_required('admin', 'technician')
        def multi_role_route():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
                user_role = claims.get('role', '')
                
                if user_role not in allowed_roles:
                    logger.warning(f'Access denied for user with role: {user_role}. Required: {allowed_roles}')
                    return jsonify({
                        "success": False,
                        "message": f"Access denied. Required roles: {', '.join(allowed_roles)}"
                    }), 403
                
                return fn(*args, **kwargs)
            except Exception as e:
                logger.error(f'Role check failed: {str(e)}')
                return jsonify({
                    "success": False,
                    "message": "Access denied",
                    "error": str(e)
                }), 403
        return wrapper
    return decorator


def get_current_user_id():
    """
    Get the current user's ID from JWT token.
    
    Returns:
        str: User's ID or None
    """
    try:
        return get_jwt_identity()
    except Exception as e:
        logger.error(f'Failed to get current user ID: {str(e)}')
        return None


def get_current_user_claims():
    """
    Get the current user's JWT claims.
    
    Returns:
        dict: JWT claims or empty dict
    """
    try:
        return get_jwt()
    except Exception as e:
        logger.error(f'Failed to get current user claims: {str(e)}')
        return {}
