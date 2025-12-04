"""
Email service for CLAIMS backend.
Handles sending templated emails with improved error handling.
"""
from flask_mail import Mail, Message
from jinja2 import Environment, FileSystemLoader
from .logger import get_logger
import os

logger = get_logger(__name__)
mail = Mail()


def init_mail(app):
    """
    Initialize email service.
    
    Args:
        app: Flask application instance
    """
    mail.init_app(app)
    logger.info('Email service initialized')


def check_email_config(app):
    """
    Check if email configuration is valid.
    
    Args:
        app: Flask application instance
        
    Returns:
        bool: True if configuration is valid, False otherwise
    """
    required_configs = ['MAIL_USERNAME', 'MAIL_PASSWORD', 'MAIL_DEFAULT_SENDER']
    missing = [c for c in required_configs if not app.config.get(c)]
    
    if missing:
        logger.warning(f'Email configuration incomplete. Missing: {", ".join(missing)}')
        return False
    
    logger.info('Email configuration valid')
    return True


def send_email(subject, recipients, template_name=None, template_context=None, body=None, html=None):
    """
    Send email with template or plain text/html.
    
    Args:
        subject: Email subject
        recipients: List of recipient email addresses or single email string
        template_name: Name of the template file (optional)
        template_context: Context dictionary for template rendering (optional)
        body: Plain text body (optional)
        html: HTML body (optional)
        
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Ensure recipients is a list
        if isinstance(recipients, str):
            recipients = [recipients]
        
        # Create message
        msg = Message(
            subject=subject,
            recipients=recipients
        )
        
        # Render template if provided
        if template_name and template_context:
            env = Environment(loader=FileSystemLoader('templates'))
            template = env.get_template(template_name)
            msg.html = template.render(template_context)
        elif html:
            msg.html = html
        elif body:
            msg.body = body
        else:
            logger.error('No email content provided (template, body, or html)')
            return False
        
        # Send email
        mail.send(msg)
        logger.info(f'Email sent successfully to {", ".join(recipients)}')
        return True
        
    except Exception as e:
        logger.error(f'Failed to send email: {str(e)}')
        logger.error(f'Subject: {subject}, Recipients: {recipients}')
        return False


def send_templated_email(sender_email, sender_password, receiver_email, subject, template_name, context):
    """
    Legacy function for backward compatibility with existing code.
    Uses new email service implementation.
    
    Args:
        sender_email: Sender email (ignored, uses config)
        sender_password: Sender password (ignored, uses config)
        receiver_email: Recipient email(s)
        subject: Email subject
        template_name: Template file name
        context: Template context dictionary
        
    Returns:
        bool: True if email sent successfully
    """
    return send_email(
        subject=subject,
        recipients=receiver_email,
        template_name=template_name,
        template_context=context
    )


def technician_send_templated_email(sender_email, sender_password, receiver_email, subject, template_name, context):
    """
    Legacy function for backward compatibility with existing code.
    Uses new email service implementation.
    
    Args:
        sender_email: Sender email (ignored, uses config)
        sender_password: Sender password (ignored, uses config)
        receiver_email: Recipient email(s)
        subject: Email subject
        template_name: Template file name
        context: Template context dictionary
        
    Returns:
        bool: True if email sent successfully
    """
    return send_email(
        subject=subject,
        recipients=receiver_email,
        template_name=template_name,
        template_context=context
    )
