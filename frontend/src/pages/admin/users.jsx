import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { FaEdit, FaTrash, FaPlus, FaUserShield } from "react-icons/fa";
import { Modal, Button, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

export default function Users() {
    const [users, setUsers] = useState([]);
    const [filterText, setFilterText] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "technician",
        year: ""
    });
    const [selectedUser, setSelectedUser] = useState(null);

    const { user: currentUser } = useAuth();

    // Fetch users
    const fetchUsers = async () => {
        try {
            const response = await api.get("/get_users");
            setUsers(response.data);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filter users
    const filteredUsers = users.filter(
        (user) =>
            user.name.toLowerCase().includes(filterText.toLowerCase()) ||
            user.email.toLowerCase().includes(filterText.toLowerCase()) ||
            user.role.toLowerCase().includes(filterText.toLowerCase())
    );

    // Handlers
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const resetForm = () => {
        setFormData({
            name: "",
            email: "",
            password: "",
            role: "technician",
            year: ""
        });
        setSelectedUser(null);
    };

    // Add User
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/register_user", formData);
            toast.success("User added successfully");
            setShowAddModal(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error("Error adding user:", error);
            toast.error(error.response?.data?.message || "Failed to add user");
        }
    };

    // Edit User
    const handleEditClick = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: "", // Don't populate password
            role: user.role,
            year: user.year || ""
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = new FormData();
            payload.append("name", formData.name);
            payload.append("email", formData.email);
            payload.append("role", formData.role);
            payload.append("year", formData.year);
            if (formData.password) {
                payload.append("password", formData.password);
            }

            await api.put(`/users/${selectedUser.id}`, payload);
            toast.success("User updated successfully");
            setShowEditModal(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(error.response?.data?.message || "Failed to update user");
        }
    };

    // Delete User
    const handleDeleteClick = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            await api.delete(`/users/${selectedUser.id}`);
            toast.success("User deleted successfully");
            setShowDeleteModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(error.response?.data?.message || "Failed to delete user");
        }
    };

    // Columns
    const columns = [
        {
            name: "Name",
            selector: (row) => row.name,
            sortable: true,
            cell: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img
                        src={row.profile ? `/uploads/${row.profile}` : "/img/default.png"}
                        alt="profile"
                        style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }}
                        onError={(e) => { e.target.src = "/img/default.png"; }}
                    />
                    {row.name}
                </div>
            )
        },
        { name: "Email", selector: (row) => row.email, sortable: true },
        {
            name: "Role",
            selector: (row) => row.role,
            sortable: true,
            cell: (row) => (
                <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor:
                        row.role === 'admin' ? '#dc3545' :
                            row.role === 'dean' ? '#ffc107' :
                                row.role === 'itsd' ? '#17a2b8' : '#28a745',
                    color: '#fff',
                    fontSize: '0.85rem',
                    textTransform: 'capitalize'
                }}>
                    {row.role}
                </span>
            )
        },
        { name: "Year/Section", selector: (row) => row.year || "N/A", sortable: true },
        {
            name: "Actions",
            cell: (row) => (
                <div style={{ display: "flex", gap: "10px" }}>
                    <button
                        onClick={() => handleEditClick(row)}
                        style={{
                            border: "none",
                            background: "none",
                            color: "#ffc107",
                            cursor: "pointer",
                        }}
                        title="Edit"
                    >
                        <FaEdit size={18} />
                    </button>
                    {currentUser?.id !== row.id && (
                        <button
                            onClick={() => handleDeleteClick(row)}
                            style={{
                                border: "none",
                                background: "none",
                                color: "#dc3545",
                                cursor: "pointer",
                            }}
                            title="Delete"
                        >
                            <FaTrash size={18} />
                        </button>
                    )}
                </div>
            ),
            ignoreRowClick: true,
            allowOverflow: true,
            button: true,
        },
    ];

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 style={{ color: "#004d26", fontWeight: "700" }}>
                    <FaUserShield className="me-2" />
                    User Management
                </h2>
                <Button
                    variant="success"
                    style={{ backgroundColor: "#004d26", border: "none" }}
                    onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                    }}
                >
                    <FaPlus className="me-2" /> Add User
                </Button>
            </div>

            <div className="card shadow-sm">
                <div className="card-body">
                    <div className="mb-3">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search users..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            style={{ maxWidth: "300px" }}
                        />
                    </div>
                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        pagination
                        highlightOnHover
                        responsive
                        customStyles={{
                            headCells: {
                                style: {
                                    backgroundColor: "#f8f9fa",
                                    fontWeight: "bold",
                                    color: "#004d26",
                                },
                            },
                        }}
                    />
                </div>
            </div>

            {/* Add User Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add New User</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Role</Form.Label>
                            <Form.Select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                            >
                                <option value="technician">Technician</option>
                                <option value="dean">Dean</option>
                                <option value="itsd">ITSD</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Year/Section (Optional)</Form.Label>
                            <Form.Control
                                type="text"
                                name="year"
                                value={formData.year}
                                onChange={handleInputChange}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="success" type="submit" style={{ backgroundColor: "#004d26", border: "none" }}>
                            Add User
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Edit User Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit User</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleEditSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>New Password (Leave blank to keep current)</Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Role</Form.Label>
                            <Form.Select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                disabled={selectedUser?.id === currentUser?.id}
                            >
                                <option value="technician">Technician</option>

                                <option value="dean">Dean</option>
                                <option value="itsd">ITSD</option>
                            </Form.Select>
                            {selectedUser?.id === currentUser?.id && (
                                <Form.Text className="text-muted">
                                    You cannot change your own role.
                                </Form.Text>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Year/Section</Form.Label>
                            <Form.Control
                                type="text"
                                name="year"
                                value={formData.year}
                                onChange={handleInputChange}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" type="submit">
                            Save Changes
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? This action cannot be undone.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDeleteConfirm}>
                        Delete User
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
