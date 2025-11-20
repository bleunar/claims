"""
File upload service for CLAIMS backend.
Handles secure file uploads with validation.
"""
import os
from werkzeug.utils import secure_filename
from .logger import get_logger
import uuid

logger = get_logger(__name__)


def allowed_file(filename, allowed_extensions):
    """
    Check if file extension is allowed.
    
    Args:
        filename: Name of the file
        allowed_extensions: Set of allowed extensions
        
    Returns:
        bool: True if file extension is allowed
    """
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def save_uploaded_file(file, upload_folder, allowed_extensions, use_uuid=False):
    """
    Save uploaded file securely.
    
    Args:
        file: FileStorage object from request.files
        upload_folder: Directory to save the file
        allowed_extensions: Set of allowed file extensions
        use_uuid: If True, generate unique filename with UUID
        
    Returns:
        tuple: (success: bool, filename: str or error_message: str)
    """
    try:
        # Check if file is provided
        if not file or file.filename == '':
            logger.warning('No file provided for upload')
            return False, 'No file selected'
        
        # Check if file extension is allowed
        if not allowed_file(file.filename, allowed_extensions):
            logger.warning(f'Invalid file extension: {file.filename}')
            return False, f'File type not allowed. Allowed types: {", ".join(allowed_extensions)}'
        
        # Create upload folder if it doesn't exist
        os.makedirs(upload_folder, exist_ok=True)
        
        # Generate filename
        if use_uuid:
            # Use UUID to prevent filename collisions
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"{uuid.uuid4().hex}.{ext}"
        else:
            # Use secure_filename to sanitize
            filename = secure_filename(file.filename)
            
            # Check if file already exists and add suffix if needed
            base_filename = filename
            counter = 1
            while os.path.exists(os.path.join(upload_folder, filename)):
                name, ext = base_filename.rsplit('.', 1)
                filename = f"{name}_{counter}.{ext}"
                counter += 1
        
        # Save file
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)
        
        logger.info(f'File uploaded successfully: {filename}')
        return True, filename
        
    except Exception as e:
        logger.error(f'File upload failed: {str(e)}')
        return False, 'File upload failed'


def delete_file(filename, upload_folder):
    """
    Delete a file from upload folder.
    
    Args:
        filename: Name of the file to delete
        upload_folder: Directory where file is stored
        
    Returns:
        bool: True if file deleted successfully
    """
    try:
        filepath = os.path.join(upload_folder, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            logger.info(f'File deleted successfully: {filename}')
            return True
        else:
            logger.warning(f'File not found for deletion: {filename}')
            return False
    except Exception as e:
        logger.error(f'File deletion failed: {str(e)}')
        return False


def get_file_path(filename, upload_folder):
    """
    Get full path to uploaded file.
    
    Args:
        filename: Name of the file
        upload_folder: Directory where file is stored
        
    Returns:
        str: Full file path or None if file doesn't exist
    """
    filepath = os.path.join(upload_folder, filename)
    if os.path.exists(filepath):
        return filepath
    return None


def validate_file_size(file, max_size_bytes):
    """
    Validate file size.
    
    Args:
        file: FileStorage object
        max_size_bytes: Maximum allowed file size in bytes
        
    Returns:
        bool: True if file size is valid
    """
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    if file_size > max_size_bytes:
        logger.warning(f'File size ({file_size} bytes) exceeds limit ({max_size_bytes} bytes)')
        return False
    
    return True
