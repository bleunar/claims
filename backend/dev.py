"""
Development server runner for CLAIMS backend.
Runs the Flask application in development mode with debug enabled.
"""
import os
import sys

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

if __name__ == '__main__':
    # Create app with development configuration
    app = create_app('development')
    
    # Run development server
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
        use_reloader=True
    )
