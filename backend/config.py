import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration class"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-please-change')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Database Configuration
    MYSQL_HOST = os.getenv('MYSQL_HOST', '127.0.0.1')
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DB = os.getenv('MYSQL_DB', 'claims')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-please-change')
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    
    # Email Configuration
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', '')
    
    # File Upload Configuration
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16777216))  # 16MB default
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'jpg,jpeg,png,gif,pdf,csv,xlsx').split(','))
    
    # Rate Limiting Configuration
    RATELIMIT_STORAGE_URL = os.getenv('RATELIMIT_STORAGE_URL', 'memory://')
    RATELIMIT_DEFAULT = os.getenv('RATELIMIT_DEFAULT', '200 per day;50 per hour')
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/claims.log')
    
    # Admin Initialization
    ADMIN_INIT_PASSWORD = os.getenv('ADMIN_INIT_PASSWORD', None)
    
    @staticmethod
    def init_app(app):
        """Initialize application with this config"""
        pass


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    MYSQL_DB = 'claims_test'


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
