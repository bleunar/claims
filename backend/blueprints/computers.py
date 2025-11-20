"""
Computers blueprint for CLAIMS backend.
Handles computer equipment management, status updates, and editing.
"""
from flask import Blueprint, request, jsonify
import json
import random
from services.database import execute_query, get_db_cursor
from services.logger import get_logger
from utils.responses import success_response, error_response, database_error_response
from utils.decorators import jwt_required_custom, role_required, admin_required
from flask_jwt_extended import get_jwt

logger = get_logger(__name__)

computers_bp = Blueprint('computers', __name__, url_prefix='')


@computers_bp.route('/computer', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def add_computer():
    """
    Add a single computer to a laboratory.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.json.get('data')
        
        name = data.get('pc_name') # Frontend sends pc_name
        lab_id = data.get('lab_id')
        specs = data.get('specs', {})
        other_parts = data.get('other_parts', [])
        
        # Parse other_parts if it's a JSON string
        if isinstance(other_parts, str):
            try:
                other_parts = json.loads(other_parts)
            except json.JSONDecodeError:
                other_parts = []
        
        # Ensure other_parts is a list
        if not isinstance(other_parts, list):
            other_parts = []
        
        # Generate unique ID for computer
        computer_id = str(random.randint(10000000, 99999999))
        
        # Convert specs and other_parts to JSON strings
        specs_json = json.dumps(specs) if isinstance(specs, dict) else specs
        other_parts_json = json.dumps(other_parts)
        
        # Insert computer equipment
        query = """
            INSERT INTO computers (id, name, lab_id, specs, other_parts) 
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_query(query, (computer_id, name, lab_id, specs_json, other_parts_json))
        
        # Initialize computer status for each part (Unified table)
        if isinstance(specs, dict):
            for part, value in specs.items():
                status_query = """
                    INSERT INTO computer_parts (computer_id, name, type, status, notes) 
                    VALUES (%s, %s, 'standard', 'operational', '')
                """
                execute_query(status_query, (computer_id, part))
        
        # Insert other parts status for each item in the list
        for item in other_parts:
            if isinstance(item, dict) and 'name' in item:
                part_name = item['name']
                other_query = """
                    INSERT INTO computer_parts (computer_id, name, type, status, notes) 
                    VALUES (%s, %s, 'custom', 'operational', '')
                """
                execute_query(other_query, (computer_id, part_name))
        
        logger.info(f'Computer added: {name} (ID: {computer_id}) in lab_id {lab_id}')
        
        return jsonify({
            "success": True,
            "computer_id": computer_id,
            "message": "Computer added successfully"
        }), 200
        
    except Exception as e:
        logger.error(f'Add computer error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route('/computer/bulk', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def computer_bulk():
    """
    Add multiple computers in bulk.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.json.get('data')
        inserted_computers = []
        skipped = []
        
        for computer in data:
            name = computer.get('pc_name')
            lab_id = computer.get('lab_id')
            specs = computer.get('specs', {})
            other_parts = computer.get('other_parts', [])
            
            # Parse other_parts if it's a JSON string
            if isinstance(other_parts, str):
                try:
                    other_parts = json.loads(other_parts)
                except json.JSONDecodeError:
                    other_parts = []
            
            # Ensure other_parts is a list
            if not isinstance(other_parts, list):
                other_parts = []
            
            # Check if computer already exists
            check_query = "SELECT id FROM computers WHERE name = %s AND lab_id = %s"
            existing = execute_query(check_query, (name, lab_id), fetch_one=True, commit=False)
            
            if existing:
                skipped.append(name)
                continue
            
            # Generate unique ID
            computer_id = str(random.randint(10000000, 99999999))
            
            # Convert to JSON
            specs_json = json.dumps(specs) if isinstance(specs, dict) else specs
            other_parts_json = json.dumps(other_parts)
            
            # Insert computer
            query = """
                INSERT INTO computers (id, name, lab_id, specs, other_parts) 
                VALUES (%s, %s, %s, %s, %s)
            """
            execute_query(query, (computer_id, name, lab_id, specs_json, other_parts_json))
            
            # Initialize statuses (Unified table)
            if isinstance(specs, dict):
                for part in specs.keys():
                    status_query = """
                        INSERT INTO computer_parts (computer_id, name, type, status, notes) 
                        VALUES (%s, %s, 'standard', 'operational', '')
                    """
                    execute_query(status_query, (computer_id, part))
            
            # Insert other parts status for each item in the list
            for item in other_parts:
                if isinstance(item, dict) and 'name' in item:
                    part_name = item['name']
                    other_query = """
                        INSERT INTO computer_parts (computer_id, name, type, status, notes) 
                        VALUES (%s, %s, 'custom', 'operational', '')
                    """
                    execute_query(other_query, (computer_id, part_name))
            
            inserted_computers.append({"pc_name": name, "id": computer_id})
        
        logger.info(f'Bulk computers added: {len(inserted_computers)} inserted, {len(skipped)} skipped')
        
        return jsonify({
            "success": True,
            "inserted": inserted_computers,
            "skipped_duplicates": skipped
        }), 200
        
    except Exception as e:
        logger.error(f'Bulk computer add error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route('/get_computers', methods=['GET'])
def get_computers():
    """
    Get all computers with their specifications.
    """
    try:
        query = """
            SELECT c.id, c.name, l.name, c.lab_id, c.specs, c.other_parts 
            FROM computers c 
            LEFT JOIN laboratories l ON c.lab_id = l.id
        """
        computers = execute_query(query, fetch_all=True, commit=False)
        
        result = []
        for computer in computers:
            comp_id, name, lab_name, lab_id, specs, other_parts = computer
            
            # Parse JSON specs
            try:
                specs_dict = json.loads(specs) if specs else {}
            except:
                specs_dict = {}
            
            try:
                other_parts_dict = json.loads(other_parts) if other_parts else {}
            except:
                other_parts_dict = {}
            
            result.append({
                "id": comp_id,
                "pc_name": name, # Keep for frontend compatibility
                "name": name,
                "lab_name": lab_name,
                "lab_id": lab_id,
                "specs": specs_dict,
                "other_parts": other_parts_dict
            })
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f'Get computers error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route('/delete_computer/<string:id>', methods=['DELETE'])
@jwt_required_custom
@role_required('admin', 'itsd')
def delete_computer(id):
    """
    Delete a computer and all associated data.
    Requires admin or itsd role.
    """
    try:
        logger.info(f'Deleting computer: {id}')
        
        with get_db_cursor() as cursor:
            cursor.execute("DELETE FROM computers WHERE id = %s", (id,))
            # Cascade delete handles computer_parts
            # Reports might be set null or deleted depending on config, but safe to delete explicitly if needed
            cursor.execute("DELETE FROM reports WHERE computer_id = %s", (id,))
        
        logger.info(f'Computer deleted: {id}')
        
        return {"message": "Computer deleted"}, 200
        
    except Exception as e:
        logger.error(f'Delete computer error: {str(e)}')
        return {"error": str(e)}, 500


@computers_bp.route('/get_computer_statuses', methods=['GET'])
def get_computer_statuses():
    """
    Get all computer part statuses (Unified).
    """
    try:
        # Fetch all parts from the unified table
        query = "SELECT * FROM computer_parts"
        results = execute_query(query, fetch_all=True, commit=False)
        
        statuses = []
        for row in results:
            # id, computer_id, name, type, status, notes, updated_at
            status = {
                "id": row[0],
                "com_id": row[1], # Keep for frontend compatibility
                "computer_id": row[1],
                "part": row[2], # Keep for frontend compatibility
                "name": row[2],
                "type": row[3],
                "status": 1 if row[4] == 'operational' else 2 if row[4] == 'not_operational' else 3 if row[4] == 'damaged' else 4, # Map ENUM to int for frontend compatibility if needed, or send string
                "status_label": row[4],
                "notes": row[5]
            }
            statuses.append(status)
        
        return jsonify(statuses), 200
        
    except Exception as e:
        logger.error(f'Get computer statuses error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route('/get_other_part_status', methods=['GET'])
def get_other_part_status():
    """
    Get all other part statuses.
    DEPRECATED: Now returns custom parts from computer_parts table.
    """
    try:
        query = "SELECT * FROM computer_parts WHERE type = 'custom'"
        results = execute_query(query, fetch_all=True, commit=False)
        
        statuses = []
        for row in results:
            status = {
                "id": row[0],
                "com_id": row[1],
                "computer_id": row[1],
                "part": row[2],
                "name": row[2],
                "status": 1 if row[4] == 'operational' else 2 if row[4] == 'not_operational' else 3 if row[4] == 'damaged' else 4,
                "status_label": row[4],
                "notes": row[5]
            }
            statuses.append(status)
        
        return jsonify(statuses), 200
        
    except Exception as e:
        logger.error(f'Get other part status error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route('/update_computer_status', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def update_computer_status():
    """
    Update computer part status.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.json
        com_id = data.get('com_id')
        part = data.get('part')
        status_val = data.get('status') # Int or String
        notes = data.get('notes', '')
        
        # Map int status to ENUM if necessary
        status_map = {1: 'operational', 2: 'not_operational', 3: 'damaged', 4: 'missing'}
        if isinstance(status_val, int):
            status_enum = status_map.get(status_val, 'operational')
        else:
            status_enum = status_val

        # Check if part exists
        check_query = "SELECT id FROM computer_parts WHERE computer_id = %s AND name = %s"
        existing = execute_query(check_query, (com_id, part), fetch_one=True, commit=False)
        
        if existing:
            # Update existing
            query = """
                UPDATE computer_parts 
                SET status = %s, notes = %s 
                WHERE computer_id = %s AND name = %s
            """
            execute_query(query, (status_enum, notes, com_id, part))
        else:
            # Insert new - we don't have type here, default to standard or infer?
            # Assuming standard if not specified, but this endpoint is less used now.
            # Let's default to 'standard' as it's safer.
            query = """
                INSERT INTO computer_parts (computer_id, name, type, status, notes)
                VALUES (%s, %s, 'standard', %s, %s)
            """
            execute_query(query, (com_id, part, status_enum, notes))
        
        # Auto-generate report if status is not operational
        if status_enum in ['not_operational', 'damaged', 'missing']:
            try:
                claims = get_jwt()
                user_email = claims.get('email', 'System')
                
                report_query = """
                    INSERT INTO reports (computer_id, part_name, issue_description, status, submitted_by)
                    VALUES (%s, %s, %s, 'pending', %s)
                """
                execute_query(report_query, (com_id, part, notes, user_email))
                logger.info(f'Auto-generated report for {com_id} - {part}')
            except Exception as e:
                logger.error(f'Failed to auto-generate report: {str(e)}')
        
        logger.info(f'Computer status updated: {com_id} - {part}')
        
        return jsonify({"success": True, "message": "Status updated"}), 200
        
    except Exception as e:
        logger.error(f'Update computer status error: {str(e)}')
        return database_error_response(e, "Failed to update status")


@computers_bp.route('/update_computer_status_bulk', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def update_computer_status_bulk():
    """
    Update multiple computer statuses in bulk.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.json
        all_statuses = data.get("statuses", {})
        
        status_map = {1: 'operational', 2: 'not_operational', 3: 'damaged', 4: 'missing'}
        
        with get_db_cursor() as cursor:
            for com_id, parts in all_statuses.items():
                for part, status_data in parts.items():
                    status_val = status_data.get("status")
                    notes = status_data.get("notes", "")
                    
                    if isinstance(status_val, int):
                        status_enum = status_map.get(status_val, 'operational')
                    else:
                        status_enum = status_val
                    
                    # Check if part exists
                    check_query = "SELECT id FROM computer_parts WHERE computer_id = %s AND name = %s"
                    cursor.execute(check_query, (com_id, part))
                    existing = cursor.fetchone()
                    
                    if existing:
                        # Update existing
                        query = """
                            UPDATE computer_parts 
                            SET status = %s, notes = %s 
                            WHERE computer_id = %s AND name = %s
                        """
                        cursor.execute(query, (status_enum, notes, com_id, part))
                    else:
                        # Insert new
                        part_type = status_data.get("type", "standard")
                        query = """
                            INSERT INTO computer_parts (computer_id, name, type, status, notes)
                            VALUES (%s, %s, %s, %s, %s)
                        """
                        cursor.execute(query, (com_id, part, part_type, status_enum, notes))
                    
                    # Auto-generate report if status is not operational
                    logger.info(f'Checking status for report generation: {status_enum} (Part: {part})')
                    if status_enum in ['not_operational', 'damaged', 'missing']:
                        try:
                            claims = get_jwt()
                            user_email = claims.get('email', 'System')
                            logger.info(f'Attempting to create report for {com_id} - {part} by {user_email}')
                            
                            report_query = """
                                INSERT INTO reports (computer_id, part_name, issue_description, status, submitted_by)
                                VALUES (%s, %s, %s, 'pending', %s)
                            """
                            cursor.execute(report_query, (com_id, part, notes, user_email))
                            logger.info('Report insert query executed')
                        except Exception as e:
                            logger.error(f'Failed to auto-generate report in bulk update: {str(e)}')
        
        logger.info(f'Bulk computer statuses updated')
        
        return jsonify({"success": True, "message": "Statuses updated"}), 200
        
    except Exception as e:
        logger.error(f'Bulk update status error: {str(e)}')
        return database_error_response(e, "Failed to update statuses")


@computers_bp.route("/get_edit_data/", methods=["GET"])
def get_edit_data():
    """
    Get all computer equipment data for editing.
    """
    try:
        query = """
            SELECT c.id, c.name, l.name, c.lab_id, c.specs, c.other_parts 
            FROM computers c 
            LEFT JOIN laboratories l ON c.lab_id = l.id
        """
        results = execute_query(query, fetch_all=True, commit=False)
        
        statuses = []
        for row in results:
            status = {
                "id": row[0],
                "pc_name": row[1],
                "name": row[1],
                "lab_name": row[2],
                "lab_id": row[3],
                "specs": row[4],
                "other_parts": row[5]
            }
            statuses.append(status)
        
        return jsonify(statuses), 200
        
    except Exception as e:
        logger.error(f'Get edit data error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route("/update_edit_data/<pc_id>", methods=["POST"])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def update_edit_data(pc_id):
    """
    Update computer equipment data.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.get_json()
        
        name = data.get("pc_name")
        specs = data.get("specs", {})
        other_parts = data.get("other_parts", {})
        
        # Convert to JSON strings
        specs_json = json.dumps(specs) if isinstance(specs, dict) else specs
        other_parts_json = json.dumps(other_parts) if isinstance(other_parts, dict) else other_parts
        
        # Update computers
        query = """
            UPDATE computers 
            SET name = %s, specs = %s, other_parts = %s 
            WHERE id = %s
        """
        execute_query(query, (name, specs_json, other_parts_json, pc_id))
        
        # Note: We might need to update computer_parts names if they changed, 
        # but usually specs keys remain consistent. 
        # If the user renames a part in specs, we might need complex logic to sync computer_parts.
        # For now, we assume parts structure remains stable or is handled by re-initialization if needed.
        
        logger.info(f'Computer data updated: {pc_id}')
        
        return jsonify({"success": True, "message": "Computer updated successfully"}), 200
        
    except Exception as e:
        logger.error(f'Update edit data error: {str(e)}')
        return jsonify({"error": str(e)}), 500
