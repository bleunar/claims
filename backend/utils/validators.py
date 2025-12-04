"""
Input validation utilities for CLAIMS backend.
Provides validation schemas and helpers using marshmallow.
"""
from marshmallow import Schema, fields, validates, ValidationError, validate
import re


# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


class LoginSchema(Schema):
    """Validation schema for login requests"""
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=1))


class RegisterUserSchema(Schema):
    """Validation schema for user registration"""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    role = fields.Str(validate=validate.OneOf(['admin', 'dean', 'itsd', 'technician']))


class UpdateProfileSchema(Schema):
    """Validation schema for profile updates"""
    name = fields.Str(validate=validate.Length(min=1, max=100))
    email = fields.Email()
    currentPassword = fields.Str()
    newPassword = fields.Str(validate=validate.Length(min=6))
    image = fields.Str()


class LabSchema(Schema):
    """Validation schema for laboratory data"""
    lab_name = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    location = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    capacity = fields.Int()


class ComputerSchema(Schema):
    """Validation schema for computer equipment"""
    pc_name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    lab_name = fields.Str(required=True)
    specs = fields.Dict()
    other_parts = fields.Dict()


class ReportSchema(Schema):
    """Validation schema for reports"""
    pc_id = fields.Str(required=True)
    issue_type = fields.Str()
    description = fields.Str()
    reported_by = fields.Str()


def validate_request_data(schema_class, data):
    """
    Validate request data against a schema.
    
    Args:
        schema_class: Marshmallow schema class
        data: Data to validate (dict)
        
    Returns:
        tuple: (is_valid: bool, validated_data or errors)
    """
    schema = schema_class()
    try:
        validated_data = schema.load(data)
        return True, validated_data
    except ValidationError as err:
        return False, err.messages


def validate_email(email):
    """
    Validate email format.
    
    Args:
        email: Email string to validate
        
    Returns:
        bool: True if email is valid
    """
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email))





def sanitize_string(value, max_length=None):
    """
    Sanitize string input by stripping whitespace and limiting length.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        
    Returns:
        str: Sanitized string
    """
    if not value:
        return ""
    
    sanitized = str(value).strip()
    
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized


def validate_file_extension(filename, allowed_extensions):
    """
    Validate file extension.
    
    Args:
        filename: Name of the file
        allowed_extensions: Set of allowed extensions
        
    Returns:
        bool: True if extension is valid
    """
    if not filename or '.' not in filename:
        return False
    
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in allowed_extensions
