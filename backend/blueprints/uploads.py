"""
Uploads blueprint for CLAIMS backend.
Handles serving uploaded files.
"""
from flask import Blueprint, send_from_directory, current_app
from services.logger import get_logger

logger = get_logger(__name__)

uploads_bp = Blueprint('uploads', __name__, url_prefix='')


@uploads_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    """
    Serve uploaded files.
    """
    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    logger.debug(f'Serving file: {filename}')
    return send_from_directory(upload_folder, filename)
