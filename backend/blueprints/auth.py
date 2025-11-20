"""
Authentication blueprint for CLAIMS backend.
Handles login, logout, session management with JWT.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from services.database import execute_query
from services.logger import get_logger
from utils.responses import success_response, error_response, unauthorized_response
from utils.validators import validate_request_data, LoginSchema

logger = get_logger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='')


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint.
    Validates credentials and returns JWT token.
    
    Request JSON:
        {
            "data": {
                "email": "user@example.com",
                "password": "password123"
            }
        }
    
    Returns:
        200: Login successful with JWT token and user data
        401: Invalid credentials
        404: User not found
    """
    try:
        # Get request data
        request_data = request.json
        if not request_data or 'data' not in request_data:
            return error_response("Invalid request format", 400)
        
        data = request_data.get('data', {})
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return error_response("Email and password are required", 400)
        
        # Query user from database
        query = "SELECT id, name, email, role, year, password_hash FROM users WHERE email = %s"
        user = execute_query(query, (email,), fetch_one=True, commit=False)
        
        if not user:
            logger.warning(f'Login attempt for non-existent user: {email}')
            return jsonify({"msg": "User not found"}), 404
        
        user_id, name, email, role, year, stored_password = user
        
        # Check password
        password_valid = check_password_hash(stored_password, password)
        
        if not password_valid:
            logger.warning(f'Invalid password attempt for user: {email}')
            return jsonify({"msg": "Invalid credentials"}), 401
        
        # Create JWT token with user claims
        additional_claims = {
            "role": role,
            "name": name,
            "email": email,
            "year": year
        }
        access_token = create_access_token(
            identity=user_id,
            additional_claims=additional_claims
        )
        
        logger.info(f'User logged in successfully: {email} (Role: {role})')
        
        # Return response matching original format
        return jsonify({
            "msg": "Login successful",
            "access_token": access_token,
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "year": year
            }
        }), 200
        
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return jsonify({"msg": str(e)}), 500


@auth_bp.route('/logout', methods=['GET', 'POST'])
@jwt_required()
def logout():
    """
    User logout endpoint.
    Note: With JWT, logout is primarily handled client-side by removing the token.
    This endpoint exists for consistency with the original API.
    
    Returns:
        200: Logout successful
    """
    try:
        user_id = get_jwt_identity()
        logger.info(f'User logged out: {user_id}')
        return jsonify({"logged_in": False, "message": "Logout successful"}), 200
    except Exception as e:
        logger.error(f'Logout error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/check_session', methods=['GET'])
def check_session():
    """
    Check if user is authenticated.
    For backward compatibility - checks JWT token if provided.
    
    Returns:
        200: Session status with user data if authenticated
    """
    try:
        # Try to verify JWT if present
        from flask_jwt_extended import verify_jwt_in_request, get_jwt
        
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            
            if user_id:
                # Get user claims from JWT
                claims = get_jwt()
                
                user_data = {
                    "id": user_id,
                    "name": claims.get('name'),
                    "email": claims.get('email'),
                    "role": claims.get('role'),
                    "year": claims.get('year')
                }
                
                return jsonify({"logged_in": True, "user": user_data}), 200
        except:
            pass
        
        # Not authenticated
        return jsonify({"logged_in": False}), 200
        
    except Exception as e:
        logger.error(f'Check session error: {str(e)}')
        return jsonify({"logged_in": False}), 200
