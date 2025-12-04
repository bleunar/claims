"""
Admin initialization service for CLAIMS backend.
Ensures at least one admin account exists on startup.
"""
from datetime import datetime
from werkzeug.security import generate_password_hash
from .database import execute_query
from .logger import get_logger

logger = get_logger(__name__)


def check_admin_exists():
    """
    Check if an admin account exists in the database.
    
    Returns:
        bool: True if admin exists, False otherwise
    """
    try:
        query = "SELECT COUNT(*) FROM users WHERE role = 'admin'"
        result = execute_query(query, fetch_one=True, commit=False)
        
        if result and result[0] > 0:
            logger.info(f'Admin account exists: {result[0]} admin(s) found')
            return True
        
        logger.warning('No admin account found in database')
        return False
        
    except Exception as e:
        logger.error(f'Error checking admin existence: {str(e)}')
        return False


def create_default_admin():
    """
    Create a default admin account with predefined credentials.
    
    Default credentials:
        - id: 0
        - name: admin
        - email: admin@example.com
        - role: admin
        - password: changeme
        - year: current year
    
    Returns:
        bool: True if admin created successfully, False otherwise
    """
    try:
        import os
        import secrets
        
        # Default admin credentials
        admin_id = "0"
        admin_name = "admin"
        admin_email = "admin@example.com"
        admin_role = "admin"
        # Get password from env or generate random secure password
        admin_password = os.getenv('ADMIN_INIT_PASSWORD')
        if not admin_password:
            admin_password = secrets.token_urlsafe(12)
            logger.warning('No ADMIN_INIT_PASSWORD set. Generated random password.')
        admin_year = str(datetime.now().year)
        
        # Hash the password
        hashed_password = generate_password_hash(admin_password, method='pbkdf2:sha256')
        
        # Insert default admin
        query = """
            INSERT INTO users (id, name, email, password_hash, role, year, profile_image) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        execute_query(query, (admin_id, admin_name, admin_email, hashed_password, admin_role, admin_year, ''))
        
        logger.info('=' * 60)
        logger.info('DEFAULT ADMIN ACCOUNT CREATED')
        logger.info('=' * 60)
        logger.info(f'Email: {admin_email}')
        logger.info(f'Password: {admin_password}')
        logger.info('⚠️  IMPORTANT: Change this password immediately after first login!')
        logger.info('=' * 60)
        
        return True
        
    except Exception as e:
        logger.error(f'Failed to create default admin account: {str(e)}')
        return False


def initialize_admin():
    """
    Main initialization function to ensure admin account exists.
    Called during application startup.
    
    Returns:
        bool: True if admin exists or was created, False on error
    """
    try:
        logger.info('Checking for admin account...')
        
        # Check if admin exists
        if check_admin_exists():
            logger.info('Admin account verification: PASSED ✓')
            return True
        
        # No admin found, create default admin
        logger.warning('No admin account found. Creating default admin...')
        
        if create_default_admin():
            logger.info('Default admin account created successfully ✓')
            return True
        else:
            logger.error('Failed to create default admin account ✗')
            return False
            
    except Exception as e:
        logger.error(f'Admin initialization error: {str(e)}')
        return False
