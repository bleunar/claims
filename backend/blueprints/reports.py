"""
Reports blueprint for CLAIMS backend.
Handles report submission, management, and email notifications.
"""
from flask import Blueprint, request, jsonify
from services.database import execute_query, get_db_cursor
from services.email_service import send_email
from services.logger import get_logger
from utils.responses import success_response, error_response, database_error_response
from utils.decorators import jwt_required_custom, role_required
import uuid
from datetime import datetime

logger = get_logger(__name__)

reports_bp = Blueprint('reports', __name__, url_prefix='')


@reports_bp.route('/add_report', methods=['POST'])
@jwt_required_custom
def add_report():
    """
    Add a new report.
    Requires authentication.
    """
    try:
        email = request.headers.get("X-User-Email")
        report = request.json.get('data')
        
        # New schema expects computer_id, part_name, issue_description
        # Adapting to receive these or map old fields if possible
        computer_id = report.get('computer_id')
        part_name = report.get('part_name') or report.get('item') # Fallback for transition
        issue_description = report.get('issue_description') or report.get('notes')
        status = report.get('status', 'pending')
        
        # If computer_id is missing but we have lab and item, we might have an issue linking it strictly
        # For now, we assume frontend will send computer_id. 
        # If not, we might insert with NULL computer_id if allowed, but schema has FK.
        # Schema: computer_id DEFAULT NULL.
        
        query = """
            INSERT INTO reports (computer_id, part_name, issue_description, status, submitted_by) 
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_query(query, (computer_id, part_name, issue_description, status, email))
        
        logger.info(f'Report added by {email} for computer {computer_id}')
        
        return {"report": "added successfully"}, 200
        
    except Exception as e:
        logger.error(f'Add report error: {str(e)}')
        return database_error_response(e, "Failed to add report")


@reports_bp.route('/delete_report/<id>', methods=['DELETE'])
@jwt_required_custom
@role_required('admin', 'technician')
def delete_report(id):
    """
    Delete report(s).
    Requires admin or technician role.
    """
    try:
        if id == "ALL":
            query = "DELETE FROM reports"
            execute_query(query)
            logger.info('All reports deleted')
            return {"message": "All reports deleted"}, 200
        else:
            query = "DELETE FROM reports WHERE id = %s"
            execute_query(query, (id,))
            logger.info(f'Report deleted: {id}')
            return {"message": "Report deleted"}, 200
            
    except Exception as e:
        logger.error(f'Delete report error: {str(e)}')
        return {"error": str(e)}, 500


@reports_bp.route('/get_data', methods=['GET'])
def get_data():
    """
    Get comprehensive data including users, reports, computer statuses.
    This endpoint returns dashboard data formatted for the frontend.
    """
    try:
        result = {}
        
        # Fetch all necessary data
        users = execute_query("SELECT * FROM users", fetch_all=True, commit=False)
        reports = execute_query("SELECT * FROM reports", fetch_all=True, commit=False)
        computer_parts = execute_query("SELECT * FROM computer_parts", fetch_all=True, commit=False)
        labs = execute_query("SELECT id, name FROM laboratories", fetch_all=True, commit=False)
        computers = execute_query("SELECT id, lab_id FROM computers", fetch_all=True, commit=False)
        
        # --- Stats ---
        operational_count = sum(1 for part in computer_parts if part[4] == 'operational')
        damaged_count = sum(1 for part in computer_parts if part[4] == 'damaged')
        missing_count = sum(1 for part in computer_parts if part[4] == 'missing')
        not_operational_count = sum(1 for part in computer_parts if part[4] == 'not_operational')
        
        result['stats'] = {
            'operational': operational_count,
            'damaged': damaged_count,
            'missing': missing_count,
            'notOperational': not_operational_count,
            'totalComputers': len(computers),
            'totalLabs': len(labs),
            'reportsSubmitted': len(reports),
            'totalUsers': len(users)
        }
        
        # --- Computer Part Status (Group by part name) ---
        # computer_parts: id, computer_id, name, type, status, notes
        part_stats = {}
        for part in computer_parts:
            name = part[2]
            status = part[4]
            if name not in part_stats:
                part_stats[name] = {'name': name, 'operational': 0, 'notOperational': 0, 'missing': 0, 'damaged': 0}
            
            if status == 'operational':
                part_stats[name]['operational'] += 1
            elif status == 'not_operational':
                part_stats[name]['notOperational'] += 1
            elif status == 'missing':
                part_stats[name]['missing'] += 1
            elif status == 'damaged':
                part_stats[name]['damaged'] += 1
                
        result['computerPartStatus'] = list(part_stats.values())
        
        # --- Lab Equipments (Computers per lab) ---
        # labs: id, name
        # computers: id, lab_id
        lab_map = {lab[0]: lab[1] for lab in labs}
        lab_comp_counts = {lab[0]: 0 for lab in labs}
        
        for comp in computers:
            lab_id = comp[1]
            if lab_id in lab_comp_counts:
                lab_comp_counts[lab_id] += 1
                
        result['labEquipments'] = [
            {'name': lab_map[lid], 'computers': count} 
            for lid, count in lab_comp_counts.items()
        ]
        
        # --- Damage vs Missing per Lab ---
        # Need to join computer_parts -> computers -> laboratories
        lab_issues = {lab[0]: {'name': lab[1], 'damaged': 0, 'missing': 0} for lab in labs}
        
        # Create a map of computer_id -> lab_id
        comp_lab_map = {comp[0]: comp[1] for comp in computers}
        
        for part in computer_parts:
            comp_id = part[1]
            status = part[4]
            if comp_id in comp_lab_map:
                lab_id = comp_lab_map[comp_id]
                if lab_id in lab_issues:
                    if status == 'damaged':
                        lab_issues[lab_id]['damaged'] += 1
                    elif status == 'missing':
                        lab_issues[lab_id]['missing'] += 1
                        
        result['damageMissing'] = list(lab_issues.values())
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f'Get data error: {str(e)}')
        return database_error_response(e, "Failed to get data")


@reports_bp.route('/get_admin_computer_reports', methods=['GET'])
@jwt_required_custom
@role_required('admin', 'dean', 'itsd')
def get_admin_computer_reports():
    """
    Get detailed computer reports for admin dashboard.
    Requires admin or dean role.
    """
    try:
        # Fetch reports with computer and lab details
        query = """
            SELECT 
                r.id, 
                r.computer_id, 
                r.part_name, 
                r.issue_description, 
                r.status, 
                r.created_at,
                c.name as pc_name,
                l.name as lab_name
            FROM reports r
            LEFT JOIN computers c ON r.computer_id = c.id
            LEFT JOIN laboratories l ON c.lab_id = l.id
            ORDER BY r.created_at DESC
        """
        results = execute_query(query, fetch_all=True, commit=False)
        
        reports_list = []
        for row in results:
            # r.id, r.computer_id, r.part_name, r.issue_description, r.status, r.created_at, pc_name, lab_name
            report = {
                "id": row[0],
                "computer_id": row[1],
                "part_name": row[2],
                "issue_description": row[3],
                "status": row[4],
                "created_at": str(row[5]),
                "pc_name": row[6] if row[6] else "Unknown",
                "lab_name": row[7] if row[7] else "Unknown"
            }
            reports_list.append(report)
        
        return jsonify(reports_list), 200
        
    except Exception as e:
        logger.error(f'Get admin reports error: {str(e)}')
        return database_error_response(e, "Failed to get reports")


@reports_bp.route('/send_report_email', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def send_report_email():
    """
    Send report notification email with summary of multiple reports.
    """
    try:
        data = request.json
        
        title = data.get('title')
        summary = data.get('summary', [])
        position = data.get('position')
        user_email = data.get('userEmail')
        user_name = data.get('userName')
        
        if not summary:
            return {"error": "No reports selected"}, 400
        
        # Prepare email context
        context = {
            'title': title,
            'summary': summary, # List of report objects - renamed to match template
            'name': user_name,  # Added to match template
            'position': position,
            'generated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Send email
        success = send_email(
            subject=f"Lab Report Summary: {title}",
            recipients=[user_email], # Send to sender for now, or configured admin list
            template_name='report.html', # Changed to existing template
            template_context=context
        )
        
        if success:
            logger.info(f'Report email sent by {user_email}')
            return {"message": "Email sent successfully"}, 200
        else:
            return {"error": "Failed to send email"}, 500
            
    except Exception as e:
        logger.error(f'Send report email error: {str(e)}')
        return database_error_response(e, "Failed to send email")


@reports_bp.route('/submit_technician_report', methods=['POST'])
@jwt_required_custom
@role_required('technician', 'admin')
def submit_technician_report():
    """
    Submit technician report for a repair/issue.
    Requires technician or admin role.
    """
    try:
        report_id = request.json.get('report_id')
        # issue_found might be redundant if we have report, but keeping it
        # action_taken is key
        action_taken = request.json.get('action_taken')
        status_after = request.json.get('status') # This is the status of the part AFTER fix
        technician_name = request.json.get('technician_name')
        
        # Generate UUID for log entry
        log_id = str(uuid.uuid4())
        
        # Insert into technician_logs
        # Schema: id, report_id, technician_id, technician_name, action_taken, status_after, created_at
        query = """
            INSERT INTO technician_logs (id, report_id, technician_name, action_taken, status_after) 
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_query(query, (log_id, report_id, technician_name, action_taken, status_after))
        
        # Update original report status to resolved if fixed, or keep in progress
        # Logic: if status_after is operational, report is resolved?
        # Or we update report status based on input?
        # Let's assume the technician explicitly sets the report status or we infer it.
        # Usually, if a log is submitted, it might be 'resolved' or 'in_progress'.
        # Let's update report status to 'resolved' if status_after is 'operational', else 'in_progress'
        
        report_status = 'resolved' if status_after == 'operational' else 'in_progress'
        
        update_query = "UPDATE reports SET status = %s WHERE id = %s"
        execute_query(update_query, (report_status, report_id))
        
        # Also update the computer part status!
        # We need to find the computer_id and part_name from the report
        report_query = "SELECT computer_id, part_name FROM reports WHERE id = %s"
        report_data = execute_query(report_query, (report_id,), fetch_one=True, commit=False)
        
        if report_data:
            computer_id, part_name = report_data
            part_update_query = "UPDATE computer_parts SET status = %s WHERE computer_id = %s AND name = %s"
            execute_query(part_update_query, (status_after, computer_id, part_name))
        
        logger.info(f'Technician report submitted for report {report_id} by {technician_name}')
        
        return {"message": "Report submitted successfully"}, 200
        
    except Exception as e:
        logger.error(f'Submit technician report error: {str(e)}')
        return database_error_response(e, "Failed to submit report")


@reports_bp.route('/get_technician_logs', methods=['GET'])
@jwt_required_custom
def get_technician_logs():
    """
    Get all technician logs.
    Requires authentication.
    """
    try:
        query = "SELECT * FROM technician_logs"
        results = execute_query(query, fetch_all=True, commit=False)
        
        logs = []
        for row in results:
            # id, report_id, technician_id, technician_name, action_taken, status_after, created_at
            log = {
                "id": row[0],
                "report_id": row[1],
                "technician_id": row[2],
                "technician_name": row[3],
                "action_taken": row[4],
                "status": row[5], # status_after
                "timestamp": str(row[6])
            }
            logs.append(log)
        
        return jsonify(logs), 200
        
    except Exception as e:
        logger.error(f'Get technician logs error: {str(e)}')
        return database_error_response(e, "Failed to get logs")


@reports_bp.route('/technician_send_report_email', methods=['POST'])
@jwt_required_custom
@role_required('technician', 'admin', 'itsd')
def technician_send_report_email():
    """
    Send technician report email with multiple logs.
    """
    try:
        data = request.json.get('data')
        
        title = data.get('title')
        issue_report = data.get('issue_report', [])
        position = data.get('position')
        user_email = data.get('userEmail')
        
        if not issue_report:
            return {"error": "No logs selected"}, 400

        # Prepare context for email template
        context = {
            'title': title,
            'summary': issue_report, # List of log objects - renamed to match template
            'position': position,
            'userEmail': user_email,
            'generated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # Send email
        # We might need a loop or a template that handles the list
        # For now assuming 'technician_report_email.html' can handle a list or we construct a body
        
        # If the template expects a single log, we might need to update the template or use a generic email function
        # Let's assume we use a generic body construction here for simplicity if template is unknown,
        # or better, pass the list to the template.
        
        success = send_email(
            subject=f"Technician Report: {title}",
            recipients=[user_email], # Send to self/admin? Frontend doesn't specify recipients, maybe just to the user?
            # The original code sent to 'recipients' from data, but frontend doesn't send 'recipients'.
            # It likely sends to the ITSD/Admin or the user themselves.
            # Let's send to the user_email and maybe a default admin email if configured.
            template_name='technician.html',
            template_context=context
        )
        
        if success:
            logger.info(f'Technician report email sent by {user_email}')
            return {"message": "Email sent successfully"}, 200
        else:
            return {"error": "Failed to send email"}, 500
            
    except Exception as e:
        logger.error(f'Technician send email error: {str(e)}')
        return database_error_response(e, "Failed to send email")
