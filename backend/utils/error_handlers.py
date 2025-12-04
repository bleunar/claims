"""
Error handlers for CLAIMS backend.
Handles application-wide errors and exceptions.
"""
from flask import jsonify
from werkzeug.exceptions import HTTPException
from flask_jwt_extended.exceptions import JWTExtendedException
from services.logger import get_logger

logger = get_logger(__name__)


def register_error_handlers(app):
    """
    Register error handlers for the Flask application.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors"""
        logger.warning(f'Bad Request: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Bad request",
            "error": str(error)
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors"""
        logger.warning(f'Unauthorized: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Unauthorized access",
            "error": str(error)
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors"""
        logger.warning(f'Forbidden: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Forbidden",
            "error": str(error)
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors"""
        logger.warning(f'Not Found: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Resource not found",
            "error": str(error)
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors"""
        logger.warning(f'Method Not Allowed: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Method not allowed",
            "error": str(error)
        }), 405
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        """Handle 413 Request Entity Too Large errors"""
        logger.warning(f'Request Entity Too Large: {str(error)}')
        return jsonify({
            "success": False,
            "message": "File too large",
            "error": str(error)
        }), 413
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        """Handle 422 Unprocessable Entity errors"""
        logger.warning(f'Unprocessable Entity: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Validation failed",
            "error": str(error)
        }), 422
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error"""
        logger.error(f'Internal Server Error: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Internal server error",
            "error": str(error)
        }), 500
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle all HTTP exceptions"""
        logger.warning(f'HTTP Exception: {error.code} - {str(error)}')
        return jsonify({
            "success": False,
            "message": error.description,
            "error": str(error)
        }), error.code
    
    @app.errorhandler(JWTExtendedException)
    def handle_jwt_exception(error):
        """Handle JWT-related exceptions"""
        logger.warning(f'JWT Exception: {str(error)}')
        return jsonify({
            "success": False,
            "message": "Authentication failed",
            "error": str(error)
        }), 401
    
    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """Handle all uncaught exceptions"""
        logger.error(f'Unhandled Exception: {str(error)}', exc_info=True)
        return jsonify({
            "success": False,
            "message": "An unexpected error occurred",
            "error": str(error)
        }), 500
    
    logger.info('Error handlers registered')
