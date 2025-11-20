"""
Laboratories blueprint for CLAIMS backend.
Handles laboratory management (CRUD operations).
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.database import execute_query, get_db_cursor
from services.logger import get_logger
from utils.responses import success_response, error_response, database_error_response
from utils.decorators import jwt_required_custom, admin_required, role_required

logger = get_logger(__name__)

labs_bp = Blueprint('labs', __name__, url_prefix='')


@labs_bp.route('/add_laboratory', methods=['POST'])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def add_laboratory():
    """
    Add a new laboratory.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.json.get('data')
        name = data.get('lab_name') # Frontend still sends lab_name
        location = data.get('location')
        
        # Check if lab already exists
        query = "SELECT name FROM laboratories WHERE name = %s"
        existing_lab = execute_query(query, (name,), fetch_one=True, commit=False)
        
        if existing_lab:
            return {"error": "Laboratory with this name already exists."}, 400
        
        # Insert new laboratory
        query = "INSERT INTO laboratories (name, location) VALUES (%s, %s)"
        execute_query(query, (name, location))
        
        # Get the new lab ID
        query = "SELECT id FROM laboratories WHERE name = %s"
        result = execute_query(query, (name,), fetch_one=True, commit=False)
        new_id = result[0] if result else None
        
        logger.info(f'Laboratory added: {name} (ID: {new_id})')
        
        return {
            "id": new_id,
            "name": name,
            "location": location
        }, 200
        
    except Exception as e:
        logger.error(f'Add laboratory error: {str(e)}')
        return database_error_response(e, "Failed to add laboratory")


@labs_bp.route('/get_laboratory', methods=['GET'])
def get_laboratory():
    """
    Get all laboratories with their computer counts.
    """
    try:
        final_data = []
        
        query = "SELECT id, name, location FROM laboratories"
        labs = execute_query(query, fetch_all=True, commit=False)
        
        for lab in labs:
            lab_id, name, location = lab
            
            # Count computers in this lab
            count_query = "SELECT COUNT(*) FROM computers WHERE lab_id = %s"
            count_result = execute_query(count_query, (lab_id,), fetch_one=True, commit=False)
            pc_count = count_result[0] if count_result else 0
            
            final_data.append({
                "lab_id": lab_id, # Keep for frontend compatibility
                "id": lab_id,
                "lab_name": name, # Keep for frontend compatibility
                "name": name,
                "location": location,
                "pc_count": pc_count
            })
        
        return jsonify(final_data), 200
        
    except Exception as e:
        logger.error(f'Get laboratories error: {str(e)}')
        return database_error_response(e, "Failed to get laboratories")


@labs_bp.route("/edit_lab/<lab_id>", methods=["PUT"])
@jwt_required_custom
@role_required('admin', 'technician', 'itsd')
def edit_lab(lab_id):
    """
    Edit laboratory information.
    Requires admin, technician, or itsd role.
    """
    try:
        data = request.get_json()
        new_name = data.get("lab_name")
        location = data.get("location")
        
        # Update laboratory
        query = "UPDATE laboratories SET name=%s, location=%s WHERE id=%s"
        execute_query(query, (new_name, location, lab_id))
        
        logger.info(f'Laboratory updated: {lab_id} -> {new_name}')
        
        return jsonify({"success": True, "message": "Lab updated successfully"}), 200
        
    except Exception as e:
        logger.error(f'Edit laboratory error: {str(e)}')
        return jsonify({"success": False, "message": str(e)}), 400


@labs_bp.route('/delete_lab/<string:lab_name>', methods=['DELETE'])
@jwt_required_custom
@role_required('admin', 'itsd')
def delete_lab(lab_name):
    """
    Delete laboratory and associated data.
    Requires admin or itsd role.
    """
    try:
        logger.info(f'Deleting laboratory: {lab_name}')
        
        with get_db_cursor() as cursor:
            # Get lab_id first
            cursor.execute("SELECT id FROM laboratories WHERE name = %s", (lab_name,))
            result = cursor.fetchone()
            
            if not result:
                return {"error": "Laboratory not found"}, 404
            
            lab_id = result[0]
            
            # Delete associated computer parts (status)
            cursor.execute("DELETE FROM computer_parts WHERE computer_id IN (SELECT id FROM computers WHERE lab_id = %s)", (lab_id,))
            
            # Delete associated reports
            # Note: Reports are linked to computers, which are linked to labs.
            # If we delete computers, reports might be set to NULL or deleted depending on constraints.
            # But for safety, we can leave them or let CASCADE handle it if configured.
            # The new schema has CASCADE on computers -> lab, and SET NULL on reports -> computer.
            
            # Delete computers in this lab
            cursor.execute("DELETE FROM computers WHERE lab_id = %s", (lab_id,))
            
            # Delete the laboratory itself
            cursor.execute("DELETE FROM laboratories WHERE id = %s", (lab_id,))
        
        logger.info(f'Laboratory deleted successfully: {lab_name}')
        
        return {"message": "Lab deleted"}, 200
        
    except Exception as e:
        logger.error(f'Delete laboratory error: {str(e)}')
        return {"error": str(e)}, 500


@labs_bp.route("/labs-pc-count", methods=["GET"])
def labs_pc_count():
    """
    Get computer count for each laboratory.
    """
    try:
        query = """
            SELECT l.name, COUNT(c.id) as pc_count 
            FROM laboratories l 
            LEFT JOIN computers c ON l.id = c.lab_id 
            GROUP BY l.name
        """
        results = execute_query(query, fetch_all=True, commit=False)
        
        data = []
        for row in results:
            name, pc_count = row
            data.append({"lab_name": name, "pc_count": pc_count})
        
        return jsonify(data), 200
        
    except Exception as e:
        logger.error(f'Labs PC count error: {str(e)}')
        return jsonify({"error": str(e)}), 500
