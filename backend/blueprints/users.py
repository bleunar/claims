"""
Users blueprint for CLAIMS backend.
Handles user management, profile updates, and registration.
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
import random
import uuid
from services.database import execute_query, get_db_cursor
from services.file_upload import save_uploaded_file
from services.logger import get_logger
from utils.responses import success_response, error_response, database_error_response
from utils.decorators import jwt_required_custom, admin_required, role_required

logger = get_logger(__name__)

users_bp = Blueprint('users', __name__, url_prefix='')


@users_bp.route("/upload_profile_image", methods=["POST"])
@jwt_required_custom
def upload_profile_image():
    """
    Upload profile image for current user.
    Requires JWT authentication.
    """
    try:
        user_id = get_jwt_identity()
        
        if "image" not in request.files:
            return jsonify({"success": False, "message": "No file uploaded"}), 400
        
        file = request.files["image"]
        if file.filename == "":
            return jsonify({"success": False, "message": "No file selected"}), 400
        
        # Save file using file upload service
        upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', {'jpg', 'jpeg', 'png', 'gif'})
        
        success, result = save_uploaded_file(file, upload_folder, allowed_extensions, use_uuid=False, custom_filename=user_id)
        
        if not success:
            return jsonify({"success": False, "message": result}), 400
        
        filename = result
        
        # Update user profile in database
        query = "UPDATE users SET profile_image=%s WHERE id=%s"
        execute_query(query, (filename, user_id))
        
        logger.info(f'Profile image updated for user {user_id}: {filename}')
        
        return jsonify({"success": True, "image_url": f"{filename}"}), 200
        
    except Exception as e:
        logger.error(f'Profile image upload error: {str(e)}')
        return database_error_response(e, "Failed to upload profile image")


@users_bp.route("/update_profile", methods=["POST"])
@jwt_required_custom
def update_profile():
    """
    Update user profile information.
    Requires JWT authentication.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        name = data.get("name")
        email = data.get("email")
        new_password = data.get("newPassword")
        current_password = data.get("currentPassword")
        image_filename = data.get("image")
        
        if image_filename and "/" in image_filename:
            image_filename = image_filename.split("/")[-1]
        
        # If changing password, verify current password first
        if new_password:
            query = "SELECT password_hash FROM users WHERE id=%s"
            result = execute_query(query, (user_id,), fetch_one=True, commit=False)
            stored_pw = result[0] if result else None
            
            # Check password
            from werkzeug.security import check_password_hash
            password_valid = check_password_hash(stored_pw, current_password)
            
            if not password_valid:
                return jsonify({"success": False, "message": "Current password is incorrect"}), 401
            
            # Hash new password
            hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')
            query = "UPDATE users SET password_hash=%s WHERE id=%s"
            execute_query(query, (hashed_password, user_id))
        
        # Update profile information
        update_fields = ["name=%s", "email=%s"]
        params = [name, email]
        
        if image_filename is not None:
            update_fields.append("profile_image=%s")
            params.append(image_filename)
            
        params.append(user_id)
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id=%s"
        execute_query(query, tuple(params))
        
        logger.info(f'Profile updated for user {user_id}')
        
        return jsonify({"success": True, "message": "Profile updated successfully"}), 200
        
    except Exception as e:
        logger.error(f'Profile update error: {str(e)}')
        return database_error_response(e, "Failed to update profile")


@users_bp.route("/get_user", methods=["GET"])
@jwt_required_custom
def get_user():
    """
    Get current user information.
    Requires JWT authentication.
    """
    try:
        user_id = get_jwt_identity()
        
        query = """
            SELECT id, name, email, role, year, profile_image 
            FROM users 
            WHERE id=%s
        """
        user = execute_query(query, (user_id,), fetch_one=True, commit=False)
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        user_id, name, email, role, year, profile_image = user
        
        user_data = {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "year": year,
            "profile": profile_image
        }
        
        return jsonify(user_data), 200
        
    except Exception as e:
        logger.error(f'Get user error: {str(e)}')
        return database_error_response(e, "Failed to get user information")


@users_bp.route('/register_user', methods=['POST'])
def register_user():
    """
    Register a new user.
    Note: May need JWT protection depending on requirements.
    """
    try:
        import uuid
        
        data = request.json
        
        # Generate UUID4 for ID
        user_id = str(uuid.uuid4())
        
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'technician').lower()  # Ensure lowercase
        
        # Validate role
        valid_roles = ['admin', 'dean', 'itsd', 'technician']
        if role not in valid_roles:
            return jsonify({"success": False, "message": f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
        
        # Hash password
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        
        # Insert user
        query = """
            INSERT INTO users (id, name, email, password_hash, role) 
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_query(query, (user_id, name, email, hashed_password, role))
        
        logger.info(f'User registered: {email} (ID: {user_id}, Role: {role})')
        
        return jsonify({"success": True}), 200
        
    except Exception as e:
        logger.error(f'User registration error: {str(e)}')
        return database_error_response(e, "Failed to register user")


@users_bp.route('/get_users', methods=['GET'])
@jwt_required_custom
@role_required('admin', 'itsd')
def get_users():
    """
    Get all users.
    Requires admin or itsd role.
    """
    try:
        # Check role for filtering
        claims = get_jwt()
        current_role = claims.get('role', '')
        
        if current_role == 'itsd':
            query = "SELECT id, name, email, role, year, profile_image FROM users WHERE role = 'technician'"
        else:
            query = "SELECT id, name, email, role, year, profile_image FROM users"
            
        users = execute_query(query, fetch_all=True, commit=False)
        
        final = []
        for user in users:
            user_id, name, email, role, year, profile_image = user
            final.append({
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "year": year,
                "profile": profile_image
            })
        
        return jsonify(final), 200
        
    except Exception as e:
        logger.error(f'Get users error: {str(e)}')
        return database_error_response(e, "Failed to get users")


@users_bp.route('/users/<string:user_id>', methods=['PUT'])
@jwt_required_custom
@role_required('admin', 'itsd')
def update_user(user_id):
    """
    Update user information by ID.
    Requires admin or itsd role.
    ITSD can only update technicians.
    """
    try:
        name = request.form.get('name')
        email = request.form.get('email')
        role = request.form.get('role')
        year = request.form.get('year')
        password = request.form.get('password')
        
        # Handle profile image upload
        profile_image = None
        if 'profile' in request.files:
            file = request.files['profile']
            if file and file.filename:
                # Save file using file upload service
                upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
                allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', {'jpg', 'jpeg', 'png', 'gif'})
                
                success, result = save_uploaded_file(file, upload_folder, allowed_extensions, use_uuid=False, custom_filename=user_id)
                
                if success:
                    profile_image = result
                else:
                    return jsonify({"success": False, "message": result}), 400
        
        # Check permissions for ITSD
        claims = get_jwt()
        current_role = claims.get('role', '')
        
        if current_role == 'itsd':
            # ITSD can only update technicians
            # First check the role of the user being updated
            check_query = "SELECT role FROM users WHERE id = %s"
            target_user = execute_query(check_query, (user_id,), fetch_one=True, commit=False)
            
            if not target_user:
                return jsonify({'error': 'User not found'}), 404
                
            if target_user[0] != 'technician':
                return jsonify({'error': 'ITSD can only update technician accounts'}), 403
                
            # If updating role, ensure it remains technician
            if role and role.lower() != 'technician':
                return jsonify({'error': 'ITSD can only assign technician role'}), 403
        
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        if name:
            update_fields.append("name=%s")
            params.append(name)
        if email:
            update_fields.append("email=%s")
            params.append(email)
        if role:
            role_lower = role.lower()
            # Validate role
            valid_roles = ['admin', 'dean', 'itsd', 'technician']
            if role_lower not in valid_roles:
                return jsonify({'error': f"Invalid role. Must be one of: {', '.join(valid_roles)}"}), 400
            update_fields.append("role=%s")
            params.append(role_lower)
        if year:
            update_fields.append("year=%s")
            params.append(year)
        if password:
            hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
            update_fields.append("password_hash=%s")
            params.append(hashed_password)
        if profile_image:
            update_fields.append("profile_image=%s")
            params.append(profile_image)
        
        params.append(user_id)
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id=%s"
        execute_query(query, tuple(params))
        
        logger.info(f'User updated: {user_id}')
        
        return jsonify({'message': 'User updated successfully'}), 200
        
    except Exception as e:
        logger.error(f'Update user error: {str(e)}')
        return database_error_response(e, "Failed to update user")


@users_bp.route('/users/<string:user_id>', methods=['DELETE'])
@jwt_required_custom
@role_required('admin', 'itsd')
def delete_user_by_id(user_id):
    """
    Delete user by ID.
    Requires admin or itsd role.
    ITSD can only delete technicians.
    """
    try:
        # Check permissions for ITSD
        claims = get_jwt()
        current_role = claims.get('role', '')
        
        if current_role == 'itsd':
            check_query = "SELECT role FROM users WHERE id = %s"
            target_user = execute_query(check_query, (user_id,), fetch_one=True, commit=False)
            
            if not target_user:
                return jsonify({'error': 'User not found'}), 404
                
            if target_user[0] != 'technician':
                return jsonify({'error': 'ITSD can only delete technician accounts'}), 403

        query = "DELETE FROM users WHERE id = %s"
        execute_query(query, (user_id,))
        
        logger.info(f'User deleted: {user_id}')
        
        return jsonify({'message': f'User {user_id} deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f'Delete user error: {str(e)}')
        return database_error_response(e, "Failed to delete user")


@users_bp.route('/delete_user/<email>', methods=['DELETE'])
@jwt_required_custom
@role_required('admin', 'itsd')
def delete_user_by_email(email):
    """
    Delete user by email.
    Requires admin or itsd role.
    ITSD can only delete technicians.
    """
    try:
        # Check permissions for ITSD
        claims = get_jwt()
        current_role = claims.get('role', '')
        
        if current_role == 'itsd':
            check_query = "SELECT role FROM users WHERE email = %s"
            target_user = execute_query(check_query, (email,), fetch_one=True, commit=False)
            
            if not target_user:
                return jsonify({'error': 'User not found'}), 404
                
            if target_user[0] != 'technician':
                return jsonify({'error': 'ITSD can only delete technician accounts'}), 403

        query = "DELETE FROM users WHERE email = %s"
        execute_query(query, (email,))
        
        logger.info(f'User deleted by email: {email}')
        
        return jsonify({"message": "User deleted"}), 200
        
    except Exception as e:
        logger.error(f'Delete user error: {str(e)}')
        return {"error": str(e)}, 500


@users_bp.route('/check_default_credentials', methods=['GET'])
@jwt_required_custom
def check_default_credentials():
    """
    Check if current user has default admin credentials.
    Returns true if user needs to update credentials.
    """
    try:
        user_id = get_jwt_identity()
        
        # Get user info
        query = "SELECT id, email, password_hash FROM users WHERE id=%s"
        user = execute_query(query, (user_id,), fetch_one=True, commit=False)
        
        if not user:
            return jsonify({"needs_update": False}), 200
        
        user_id, email, password_hash = user
        
        # Check if this is the default admin account
        is_default_id = (user_id == "0")
        is_default_email = (email == "admin@example.com")
        
        # Check if password is still "changeme"
        is_default_password = check_password_hash(password_hash, "changeme")
        
        # User needs update if they have default credentials
        needs_update = is_default_id and is_default_email and is_default_password
        
        return jsonify({
            "needs_update": needs_update,
            "is_default_admin": is_default_id
        }), 200
        
    except Exception as e:
        logger.error(f'Check default credentials error: {str(e)}')
        return jsonify({"needs_update": False}), 500


@users_bp.route('/update_default_admin', methods=['POST'])
@jwt_required_custom
def update_default_admin():
    """
    Update default admin account with new credentials and UUID.
    Validates that new credentials are not default values.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Verify this is the default admin
        query = "SELECT id, email, password_hash FROM users WHERE id=%s"
        user = execute_query(query, (user_id,), fetch_one=True, commit=False)
        
        if not user or user[0] != "0":
            return jsonify({"success": False, "message": "Not authorized"}), 403
        
        # Get new credentials
        new_name = data.get('name', '').strip()
        new_email = data.get('email', '').strip()
        new_password = data.get('password', '').strip()
        
        # Validation: Check for required fields
        if not new_name or not new_email or not new_password:
            return jsonify({
                "success": False,
                "message": "All fields are required"
            }), 400
        
        # Validation: Prevent default values
        if new_name.lower() == "admin":
            return jsonify({
                "success": False,
                "message": "Cannot use 'admin' as name. Please choose a different name."
            }), 400
        
        if new_email.lower() == "admin@example.com":
            return jsonify({
                "success": False,
                "message": "Cannot use default email. Please use your actual email address."
            }), 400
        
        if new_password.lower() == "changeme":
            return jsonify({
                "success": False,
                "message": "Cannot use 'changeme' as password. Please choose a secure password."
            }), 400
        
        # Validation: Password length
        if len(new_password) < 6:
            return jsonify({
                "success": False,
                "message": "Password must be at least 6 characters long"
            }), 400
        
        # Generate new UUID for the admin
        new_id = str(uuid.uuid4())
        
        # Hash new password
        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256')
        
        # Update the user with new ID and credentials
        with get_db_cursor() as cursor:
            # Insert new admin with UUID
            insert_query = """
                INSERT INTO users (id, name, email, password_hash, role, year, profile_image)
                SELECT %s, %s, %s, %s, role, year, profile_image
                FROM users WHERE id = '0'
            """
            cursor.execute(insert_query, (new_id, new_name, new_email, hashed_password))
            
            # Delete old default admin
            delete_query = "DELETE FROM users WHERE id = '0'"
            cursor.execute(delete_query)
        
        logger.info(f'Default admin updated: New ID={new_id}, Email={new_email}')
        
        return jsonify({
            "success": True,
            "message": "Admin account updated successfully. Please login again with your new credentials.",
            "new_id": new_id
        }), 200
        
    except Exception as e:
        logger.error(f'Update default admin error: {str(e)}')
        return database_error_response(e, "Failed to update admin account")
