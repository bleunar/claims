"""
Accessories blueprint for CLAIMS backend.
Handles laboratory accessories management.
"""
from flask import Blueprint, request, jsonify
from services.database import execute_query
from services.logger import get_logger
from utils.responses import success_response, error_response, database_error_response
from utils.decorators import jwt_required_custom, role_required, admin_required

logger = get_logger(__name__)

accessories_bp = Blueprint('accessories', __name__, url_prefix='')


@accessories_bp.route('/get_accessories', methods=["GET"])
def get_accessories():
    """
    Get all laboratory accessories.
    """
    try:
        query = "SELECT * FROM accessories"
        accessories = execute_query(query, fetch_all=True, commit=False)
        
        final_data = []
        for accessory in accessories:
            # Assuming structure: id, name, quantity, lab_id, lab_name, notes
            acc_dict = {
                "id": accessory[0] if len(accessory) > 0 else None,
                "name": accessory[1] if len(accessory) > 1 else None,
                "quantity": accessory[2] if len(accessory) > 2 else None,
                "lab_id": accessory[3] if len(accessory) > 3 else None,
                "lab_name": accessory[4] if len(accessory) > 4 else None,
                "notes": accessory[5] if len(accessory) > 5 else None
            }
            final_data.append(acc_dict)
        
        return jsonify(final_data), 200
        
    except Exception as e:
        logger.error(f'Get accessories error: {str(e)}')
        return database_error_response(e, "Failed to get accessories")


@accessories_bp.route('/add_accessories', methods=["POST"])
@jwt_required_custom
@role_required('admin', 'technician')
def add_accessories():
    """
    Add new accessories to a laboratory.
    Requires admin or technician role.
    """
    try:
        data = request.json.get('data')
        
        name = data.get('name')
        quantity = data.get('quantity')
        lab_id = data.get('lab_id')
        lab_name = data.get('lab_name')
        notes = data.get('notes', '')
        
        query = """
            INSERT INTO accessories (name, quantity, lab_id, lab_name, notes) 
            VALUES (%s, %s, %s, %s, %s)
        """
        execute_query(query, (name, quantity, lab_id, lab_name, notes))
        
        logger.info(f'Accessory added: {name} (Qty: {quantity}) to lab {lab_name}')
        
        return jsonify({"success": True, "message": "Accessory added successfully"}), 200
        
    except Exception as e:
        logger.error(f'Add accessories error: {str(e)}')
        return database_error_response(e, "Failed to add accessory")


@accessories_bp.route('/update_accessory/<int:accessory_id>', methods=["PUT"])
@jwt_required_custom
@role_required('admin', 'technician')
def update_accessory(accessory_id):
    """
    Update accessory information.
    Requires admin or technician role.
    """
    try:
        data = request.get_json()
        
        name = data.get('name')
        quantity = data.get('quantity')
        notes = data.get('notes')
        
        query = """
            UPDATE accessories 
            SET name = %s, quantity = %s, notes = %s 
            WHERE id = %s
        """
        execute_query(query, (name, quantity, notes, accessory_id))
        
        logger.info(f'Accessory updated: {accessory_id}')
        
        return jsonify({"success": True, "message": "Accessory updated successfully"}), 200
        
    except Exception as e:
        logger.error(f'Update accessory error: {str(e)}')
        return database_error_response(e, "Failed to update accessory")


@accessories_bp.route('/delete_accessory/<int:accessory_id>', methods=["DELETE"])
@jwt_required_custom
@admin_required
def delete_accessory(accessory_id):
    """
    Delete an accessory.
    Requires admin role.
    """
    try:
        query = "DELETE FROM accessories WHERE id = %s"
        execute_query(query, (accessory_id,))
        
        logger.info(f'Accessory deleted: {accessory_id}')
        
        return jsonify({"success": True, "message": "Accessory deleted successfully"}), 200
        
    except Exception as e:
        logger.error(f'Delete accessory error: {str(e)}')
        return database_error_response(e, "Failed to delete accessory")
