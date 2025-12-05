"""
Computers blueprint for CLAIMS backend.
Handles computer equipment management, status updates, and editing.
"""
from flask import Blueprint, request, jsonify
import json
import random
import uuid
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
        computer_id = str(uuid.uuid4())
        
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
            for category, details in specs.items():
                # details is expected to be { "name": "...", "serial": "..." }
                part_name = details.get('name', '')
                serial_number = details.get('serial', '')
                
                status_query = """
                    INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes) 
                    VALUES (%s, %s, %s, %s, 'standard', 'operational', '')
                """
                execute_query(status_query, (computer_id, part_name, serial_number, category))
        
        # Insert other parts status for each item in the list
        for item in other_parts:
            if isinstance(item, dict) and 'name' in item:
                part_name = item['name']
                serial_number = item.get('serial', '')
                other_query = """
                    INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes) 
                    VALUES (%s, %s, %s, 'other', 'custom', 'operational', '')
                """
                execute_query(other_query, (computer_id, part_name, serial_number))
        
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
            computer_id = str(uuid.uuid4())
            
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
                for category, details in specs.items():
                    # details might be string (old format) or dict (new format)
                    if isinstance(details, dict):
                        part_name = details.get('name', '')
                        serial_number = details.get('serial', '')
                    else:
                        part_name = str(details)
                        serial_number = ''

                    status_query = """
                        INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes) 
                        VALUES (%s, %s, %s, %s, 'standard', 'operational', '')
                    """
                    execute_query(status_query, (computer_id, part_name, serial_number, category))
            
            # Insert other parts status for each item in the list
            for item in other_parts:
                if isinstance(item, dict) and 'name' in item:
                    part_name = item['name']
                    serial_number = item.get('serial', '')
                    other_query = """
                        INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes) 
                        VALUES (%s, %s, %s, 'other', 'custom', 'operational', '')
                    """
                    execute_query(other_query, (computer_id, part_name, serial_number))
            
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
            # id, computer_id, name, serial_number, category, type, status, notes, updated_at
            # Note: Indexing depends on table structure. Assuming:
            # id(0), computer_id(1), name(2), serial_number(3), category(4), type(5), status(6), notes(7), updated_at(8)
            # But we used SELECT * which might be risky if columns change.
            # Let's map by name if possible, or assume the order from schema.
            # Schema order: id, computer_id, name, serial_number, category, type, status, notes, updated_at
            
            status = {
                "id": row[0],
                "com_id": row[1],
                "computer_id": row[1],
                "part": row[4] if row[4] and row[4] != 'other' else row[2], # Use category as part key for standard, or name for custom/other
                "name": row[2],
                "serial_number": row[3],
                "category": row[4],
                "type": row[5],
                "status": 1 if row[6] == 'operational' else 2 if row[6] == 'not_operational' else 3 if row[6] == 'damaged' else 4,
                "status_label": row[6],
                "notes": row[7]
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
                    new_name = status_data.get("name") # Get new name if provided
                    
                    if isinstance(status_val, int):
                        status_enum = status_map.get(status_val, 'operational')
                    else:
                        status_enum = status_val
                    
                    # Check if part exists by name or category
                    check_query = "SELECT id, name, status, serial_number FROM computer_parts WHERE computer_id = %s AND (name = %s OR category = %s) LIMIT 1"
                    cursor.execute(check_query, (com_id, part, part))
                    existing = cursor.fetchone()
                    
                    new_serial = status_data.get("serial") # Get new serial if provided
                    
                    if existing:
                        part_id, current_name, current_status, current_serial = existing
                        changes = []
                        
                        # Detect changes
                        effective_name = new_name if new_name else current_name
                        
                        if new_name and new_name != current_name:
                            changes.append(f"{part.capitalize()} Name updated to {new_name}")
                        
                        if new_serial and new_serial != current_serial:
                            changes.append(f"{part.capitalize()} Serial updated to {new_serial}")
                            
                        if status_enum != current_status:
                            changes.append(f"{part.capitalize()} is {status_enum}")
                        
                        # Update existing by ID
                        update_fields = ["status = %s", "notes = %s"]
                        update_params = [status_enum, notes]
                        
                        if new_name:
                            update_fields.append("name = %s")
                            update_params.append(new_name)
                            
                        if new_serial:
                            update_fields.append("serial_number = %s")
                            update_params.append(new_serial)
                            
                        update_params.append(part_id)
                        
                        query = f"UPDATE computer_parts SET {', '.join(update_fields)} WHERE id = %s"
                        cursor.execute(query, tuple(update_params))
                        
                        # Generate report if there are changes
                        if changes:
                            try:
                                claims = get_jwt()
                                user_email = claims.get('email', 'System')
                                change_description = ". ".join(changes)
                                if notes:
                                    change_description += f". Notes: {notes}"
                                
                                report_query = """
                                    INSERT INTO reports (computer_id, part_name, issue_description, status, submitted_by)
                                    VALUES (%s, %s, %s, 'pending', %s)
                                """
                                # Use new_name if available, else current_name
                                report_part_name = new_name if new_name else current_name
                                cursor.execute(report_query, (com_id, report_part_name, change_description, user_email))
                                logger.info(f'Report generated for {com_id} - {report_part_name}: {change_description}')
                            except Exception as e:
                                logger.error(f'Failed to auto-generate report in bulk update: {str(e)}')
                                
                    else:
                        # Insert new
                        part_type = status_data.get("type", "standard")
                        category = part if part_type == 'standard' else 'other'
                        # Use new_name if provided, else part (key)
                        final_name = new_name if new_name else part
                        final_serial = new_serial if new_serial else ''
                        
                        query = """
                            INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """
                        cursor.execute(query, (com_id, final_name, final_serial, category, part_type, status_enum, notes))
                        
                        # Auto-generate report for new non-operational parts
                        if status_enum in ['not_operational', 'damaged', 'missing']:
                            try:
                                claims = get_jwt()
                                user_email = claims.get('email', 'System')
                                
                                report_query = """
                                    INSERT INTO reports (computer_id, part_name, issue_description, status, submitted_by)
                                    VALUES (%s, %s, %s, 'pending', %s)
                                """
                                cursor.execute(report_query, (com_id, final_name, f"New part added with status: {status_enum}. Notes: {notes}", user_email))
                            except Exception as e:
                                logger.error(f'Failed to auto-generate report for new part: {str(e)}')
        
        logger.info(f'Bulk computer statuses updated')
        
        return jsonify({"success": True, "message": "Statuses updated"}), 200
        
    except Exception as e:
        logger.error(f'Bulk update status error: {str(e)}')
        return database_error_response(e, "Failed to update statuses")


@computers_bp.route("/get_computer_details/<computer_id>", methods=["GET"])
def get_computer_details(computer_id):
    """
    Get detailed computer information including fresh parts data.
    """
    try:
        # Get basic computer info and legacy specs
        query = "SELECT id, name, lab_id, specs, other_parts FROM computers WHERE id = %s"
        computer = execute_query(query, (computer_id,), fetch_one=True, commit=False)
        
        if not computer:
            return jsonify({"error": "Computer not found"}), 404
            
        comp_id, name, lab_id, legacy_specs, legacy_other_parts = computer
        
        # Get all parts from computer_parts table
        parts_query = "SELECT name, serial_number, category, type FROM computer_parts WHERE computer_id = %s"
        parts = execute_query(parts_query, (computer_id,), fetch_all=True, commit=False)
        
        specs = {}
        other_parts = []
        
        if parts:
            for part in parts:
                part_name, serial, category, part_type = part
                
                if part_type == 'standard':
                    # For standard parts, category is the key (e.g., 'monitor', 'keyboard')
                    specs[category] = {
                        "name": part_name,
                        "serial": serial
                    }
                else:
                    # For custom/other parts
                    other_parts.append({
                        "name": part_name,
                        "serial": serial
                    })
        else:
            # Fallback to legacy data if computer_parts is empty
            if legacy_specs:
                specs = json.loads(legacy_specs) if isinstance(legacy_specs, str) else legacy_specs
                # Ensure structure is consistent (convert string values to objects if needed)
                for key, val in specs.items():
                    if isinstance(val, str):
                        specs[key] = {"name": val, "serial": ""}
            
            if legacy_other_parts:
                other_parts = json.loads(legacy_other_parts) if isinstance(legacy_other_parts, str) else legacy_other_parts

        return jsonify({
            "id": comp_id,
            "pc_name": name,
            "lab_id": lab_id,
            "specs": specs,
            "other_parts": other_parts
        }), 200
        
    except Exception as e:
        logger.error(f'Get computer details error: {str(e)}')
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
        other_parts = data.get("other_parts", [])
        
        # Convert to JSON strings for computers table
        specs_json = json.dumps(specs) if isinstance(specs, dict) else specs
        other_parts_json = json.dumps(other_parts) if isinstance(other_parts, (list, dict)) else other_parts
        
        # 1. Update computers table
        query = """
            UPDATE computers 
            SET name = %s, specs = %s, other_parts = %s 
            WHERE id = %s
        """
        execute_query(query, (name, specs_json, other_parts_json, pc_id))
        
        # 2. Update computer_parts table and generate reports
        
        # Get current user for report
        claims = get_jwt()
        user_email = claims.get('email', 'System')
        
        # Update standard parts
        if isinstance(specs, dict):
            for category, details in specs.items():
                part_name = details.get('name', '')
                serial_number = details.get('serial', '')
                
                # Check if part exists
                check_query = "SELECT id, name, serial_number FROM computer_parts WHERE computer_id = %s AND category = %s AND type = 'standard' LIMIT 1"
                existing_part = execute_query(check_query, (pc_id, category), fetch_one=True, commit=False)
                
                if existing_part:
                    part_id, current_name, current_serial = existing_part
                    changes = []
                    
                    if part_name and part_name != current_name:
                        changes.append(f"{category.capitalize()} Name updated to {part_name}")
                    
                    if serial_number and serial_number != current_serial:
                        changes.append(f"{category.capitalize()} Serial updated to {serial_number}")
                        
                    if changes:
                        try:
                            change_description = ". ".join(changes)
                            report_query = """
                                INSERT INTO reports (computer_id, part_name, issue_description, status, submitted_by)
                                VALUES (%s, %s, %s, 'pending', %s)
                            """
                            execute_query(report_query, (pc_id, part_name if part_name else current_name, change_description, user_email))
                            logger.info(f'Report generated for {pc_id}: {change_description}')
                        except Exception as e:
                            logger.error(f'Failed to generate report for update: {str(e)}')

                    update_query = """
                        UPDATE computer_parts 
                        SET name = %s, serial_number = %s 
                        WHERE computer_id = %s AND category = %s AND type = 'standard'
                    """
                    execute_query(update_query, (part_name, serial_number, pc_id, category))
                else:
                    # Insert if missing
                    insert_query = """
                        INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes)
                        VALUES (%s, %s, %s, %s, 'standard', 'operational', '')
                    """
                    execute_query(insert_query, (pc_id, part_name, serial_number, category))

        # Update custom parts (Delete all custom parts and re-insert)
        # Note: Tracking changes for custom parts is harder because they are deleted and re-inserted.
        # We could try to match by name, but for now we'll skip reporting for custom parts edits 
        # unless we implement a smarter diffing logic.
        delete_custom_query = "DELETE FROM computer_parts WHERE computer_id = %s AND type = 'custom'"
        execute_query(delete_custom_query, (pc_id,))
        
        if isinstance(other_parts, list):
            for item in other_parts:
                if isinstance(item, dict):
                    part_name = item.get('name', '')
                    serial_number = item.get('serial', '')
                    
                    insert_custom_query = """
                        INSERT INTO computer_parts (computer_id, name, serial_number, category, type, status, notes)
                        VALUES (%s, %s, %s, 'other', 'custom', 'operational', '')
                    """
                    execute_query(insert_custom_query, (pc_id, part_name, serial_number))
        
        logger.info(f'Computer data updated: {pc_id}')
        
        return jsonify({"success": True, "message": "Computer updated successfully"}), 200
        
    except Exception as e:
        logger.error(f'Update edit data error: {str(e)}')
        return jsonify({"error": str(e)}), 500


@computers_bp.route('/delete_computer/bulk', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def delete_computer_bulk():
    """
    Delete multiple computers by ID.
    """
    try:
        data = request.json
        computer_ids = data.get('ids', [])
        
        if not computer_ids:
            return error_response("No computer IDs provided", 400)
            
        with get_db_cursor() as cursor:
            # Create placeholders for IN clause
            format_strings = ','.join(['%s'] * len(computer_ids))
            
            # Delete related records first (if cascading isn't fully set up, though schema says ON DELETE CASCADE)
            # But relying on schema cascade is better.
            
            query = f"DELETE FROM computers WHERE id IN ({format_strings})"
            cursor.execute(query, tuple(computer_ids))
            
        logger.info(f'Bulk deleted computers: {computer_ids}')
        return success_response(f"Successfully deleted {len(computer_ids)} computers")
        
    except Exception as e:
        logger.error(f"Error deleting computers bulk: {str(e)}")
        return database_error_response(e, "Failed to delete computers")
