from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

# Import configuration
from config import config

# Import services
from services.logger import setup_logger
from services.database import init_db, check_db_connection
from services.email_service import init_mail, check_email_config
from services.admin_init import initialize_admin

# Import utilities
from utils.error_handlers import register_error_handlers

# Import blueprints
from blueprints.auth import auth_bp
from blueprints.users import users_bp
from blueprints.labs import labs_bp
from blueprints.computers import computers_bp
from blueprints.reports import reports_bp
from blueprints.accessories import accessories_bp
from blueprints.uploads import uploads_bp


def create_app(config_name='development'):
    """
    Application factory for creating Flask app instance.
    
    Args:
        config_name: Configuration name ('development', 'production', 'testing')
        
    Returns:
        Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Initialize logging
    logger = setup_logger(app)
    logger.info(f'Starting CLAIMS Backend in {config_name} mode')
    
    # Initialize CORS
    CORS(app, 
         origins=app.config['CORS_ORIGINS'],
         supports_credentials=True)
    logger.info(f'CORS enabled for origins: {app.config["CORS_ORIGINS"]}')
    
    # Initialize JWT
    jwt = JWTManager(app)
    logger.info('JWT authentication initialized')
    
    # Initialize rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        storage_uri=app.config['RATELIMIT_STORAGE_URL'],
        default_limits=[app.config['RATELIMIT_DEFAULT']]
    )
    logger.info('Rate limiting initialized')
    
    # Initialize database
    init_db(app)
    
    # Initialize email service
    init_mail(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(labs_bp)
    app.register_blueprint(computers_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(accessories_bp)
    app.register_blueprint(uploads_bp)
    logger.info('All blueprints registered')
    
    # Health check endpoint for Docker/Kubernetes
    @app.route('/health')
    def health_check():
        """Simple health check endpoint for container orchestration."""
        return {'status': 'healthy', 'service': 'claims-backend'}, 200
    
    # Startup checks
    with app.app_context():
        # Check database connection
        if check_db_connection(app):
            logger.info('✓ Database connection verified')
        else:
            logger.error('✗ Database connection failed')
        
        # Initialize admin account (create default if none exists)
        if initialize_admin():
            logger.info('✓ Admin account verification complete')
        else:
            logger.error('✗ Admin account initialization failed')
        
        # Check email configuration
        if check_email_config(app):
            logger.info('✓ Email configuration verified')
        else:
            logger.warning('✗ Email configuration incomplete (non-critical)')
    
    # Create upload folder
    upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    logger.info(f'Upload folder ready: {upload_folder}')
    
    logger.info('CLAIMS Backend initialization complete')
    
    return app


# For backward compatibility, create app instance
# This allows running with: python app_new.py
if __name__ == '__main__':
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=app.config.get('DEBUG', False)
    )
