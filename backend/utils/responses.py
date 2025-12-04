"""
Response utilities for CLAIMS backend.
Provides standardized response formats for success, errors, and exceptions.
"""
from flask import jsonify
from services.logger import get_logger

logger = get_logger(__name__)


def success_response(data=None, message="Success", status_code=200):
    """
    Return a success response.
    
    Args:
        data: Response data (dict, list, or any JSON-serializable object)
        message: Success message
        status_code: HTTP status code
        
    Returns:
        tuple: (JSON response, status code)
    """
    response = {
        "success": True,
        "message": message
    }
    
    if data is not None:
        response["data"] = data
    
    return jsonify(response), status_code


def error_response(message="An error occurred", status_code=400, errors=None):
    """
    Return an error response.
    
    Args:
        message: Error message
        status_code: HTTP status code
        errors: Additional error details (dict or list)
        
    Returns:
        tuple: (JSON response, status code)
    """
    response = {
        "success": False,
        "message": message
    }
    
    if errors is not None:
        response["errors"] = errors
    
    logger.warning(f'Error response: {message} (Status: {status_code})')
    
    return jsonify(response), status_code


def database_error_response(error, message="Database error occurred"):
    """
    Return a database error response.
    
    Args:
        error: Exception object
        message: Error message
        
    Returns:
        tuple: (JSON response, status code)
    """
    logger.error(f'Database error: {str(error)}')
    
    return jsonify({
        "success": False,
        "message": message,
        "error": str(error)
    }), 500


def validation_error_response(errors):
    """
    Return a validation error response.
    
    Args:
        errors: Validation errors (dict or list)
        
    Returns:
        tuple: (JSON response, status code)
    """
    return error_response(
        message="Validation failed",
        status_code=422,
        errors=errors
    )


def unauthorized_response(message="Unauthorized access"):
    """
    Return an unauthorized response.
    
    Args:
        message: Error message
        
    Returns:
        tuple: (JSON response, status code)
    """
    return error_response(message=message, status_code=401)


def forbidden_response(message="Forbidden"):
    """
    Return a forbidden response.
    
    Args:
        message: Error message
        
    Returns:
        tuple: (JSON response, status code)
    """
    return error_response(message=message, status_code=403)


def not_found_response(message="Resource not found"):
    """
    Return a not found response.
    
    Args:
        message: Error message
        
    Returns:
        tuple: (JSON response, status code)
    """
    return error_response(message=message, status_code=404)
