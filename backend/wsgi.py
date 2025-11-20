"""
WSGI Entry Point for CLAIMS Backend
Used by Gunicorn to run the application in production.
"""
import os
from app import create_app

# Create application instance
# Environment can be set via FLASK_ENV environment variable
config_name = os.getenv('FLASK_ENV', 'production')
app = create_app(config_name)

if __name__ == '__main__':
    # This allows running with: python wsgi.py (for testing)
    app.run(host='0.0.0.0', port=5000)
