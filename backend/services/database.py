"""
Database service for CLAIMS backend.
Handles MySQL connection using mysql-connector-python.
"""
import mysql.connector
from mysql.connector import pooling
from mysql.connector.pooling import MySQLConnectionPool
from contextlib import contextmanager
from .logger import get_logger

logger = get_logger(__name__)

# Global connection pool
connection_pool = None


def init_db(app):
    """
    Initialize database connection pool.

    Args:
        app: Flask application instance
    """
    global connection_pool

    try:
        db_config = {
            'host': app.config['MYSQL_HOST'],
            'user': app.config['MYSQL_USER'],
            'password': app.config['MYSQL_PASSWORD'],
            'database': app.config['MYSQL_DB'],
            'pool_name': 'claims_pool',
            'pool_size': 20,
            'pool_reset_session': True,
            'autocommit': False,
            'charset': 'utf8mb4',
            'collation': 'utf8mb4_general_ci'
        }

        connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)
        logger.info('Database connection pool initialized successfully')

        # Test the connection
        test_connection()

    except Exception as e:
        logger.error(f'Failed to initialize database connection pool: {str(e)}')
        raise


def test_connection():
    """
    Test database connection.
    """
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        logger.info('Database connection test successful')
        return True
    except Exception as e:
        logger.error(f'Database connection test failed: {str(e)}')
        return False


def check_db_connection(app):
    """
    Check if database connection is working.

    Args:
        app: Flask application instance

    Returns:
        bool: True if connection is successful, False otherwise
    """
    return test_connection()


@contextmanager
def get_db_cursor(dictionary=False):
    """
    Context manager for database cursor.
    Automatically commits and closes cursor.

    Args:
        dictionary: If True, return rows as dictionaries

    Yields:
        cursor: Database cursor

    Example:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM users")
            results = cursor.fetchall()
    """
    conn = None
    cursor = None
    try:
        conn = connection_pool.get_connection()
        if dictionary:
            cursor = conn.cursor(dictionary=True)
        else:
            cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f'Database error: {str(e)}')
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=True):
    """
    Execute a database query with error handling.

    Args:
        query: SQL query string
        params: Query parameters (tuple or dict)
        fetch_one: If True, return single row
        fetch_all: If True, return all rows
        commit: If True, commit transaction

    Returns:
        Query results or None

    Raises:
        Exception: If query execution fails
    """
    conn = None
    cursor = None
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()

        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)

        result = None
        if fetch_one:
            result = cursor.fetchone()
        elif fetch_all:
            result = cursor.fetchall()

        if commit:
            conn.commit()

        return result
    except Exception as e:
        if conn and commit:
            conn.rollback()
        logger.error(f'Query execution failed: {str(e)}')
        logger.error(f'Query: {query}')
        logger.error(f'Params: {params}')
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def execute_many(query, params_list, commit=True):
    """
    Execute multiple queries with the same structure.

    Args:
        query: SQL query string
        params_list: List of parameter tuples
        commit: If True, commit transaction

    Returns:
        Number of affected rows

    Raises:
        Exception: If query execution fails
    """
    conn = None
    cursor = None
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()
        cursor.executemany(query, params_list)

        affected_rows = cursor.rowcount

        if commit:
            conn.commit()

        return affected_rows
    except Exception as e:
        if conn and commit:
            conn.rollback()
        logger.error(f'Batch query execution failed: {str(e)}')
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
