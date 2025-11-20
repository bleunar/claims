import React, { useState, useEffect } from "react";
import {
    Card,
    Row,
    Col,
    Container,
    Button,
    Modal,
    Form,
} from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import api, { uploadFile } from "../../utils/api";
import { toast } from "react-toastify";
import ITSDAddUserModal from "./ITSDAddUserModal";
import "../dean/dean.css"; // Reuse dean styles

export default function ITSDUsers() {
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({});
    const [preview, setPreview] = useState(null);

    // Fetch users from backend
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await api.get('/get_users');
                // Filter for technicians only
                const technicians = response.data.filter(u => u.role === 'technician');
                setUsers(technicians);
            } catch (error) {
                console.error('Error fetching users:', error);
                toast.error('Failed to load users');
            }
        };

        fetchUsers();
    }, []);

    // Edit user button click
    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData(user);
        setPreview(
            user.profile
                ? `http://localhost:5000/uploads/${user.profile}`
                : "/img/default.png"
        );
        setShowEdit(true);
    };

    // Delete user button click
    const handleDelete = (user) => {
        setSelectedUser(user);
        setShowDelete(true);
    };

    const handleCloseEdit = () => setShowEdit(false);
    const handleCloseDelete = () => setShowDelete(false);

    // Handle profile image change
    const handleProfileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, profile: file });
            setPreview(URL.createObjectURL(file));
        }
    };

    // Update user
    const handleUpdate = async () => {
        if (!selectedUser) return;

        try {
            const formDataToSend = new FormData();
            for (const key in formData) {
                formDataToSend.append(key, formData[key]);
            }

            const response = await uploadFile(
                `/users/${selectedUser.id}`,
                formDataToSend,
                'PUT'
            );

            console.log(response.data);
            toast.success('User updated successfully');
            setShowEdit(false);
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user');
        }
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!selectedUser) return;

        try {
            const response = await api.delete(`/users/${selectedUser.id}`);
            console.log(response.data);
            toast.success('User deleted successfully');
            setShowDelete(false);
            setTimeout(() => window.location.reload(), 500);
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        }
    };

    // Render user cards
    const renderCards = () => {
        return (
            <Row className="g-3">
                {users.map((user) => {
                    const imageSrc = user.profile
                        ? `http://localhost:5000/uploads/${user.profile}`
                        : "/img/default.png";

                    return (
                        <Col md={6} lg={4} xl={3} key={user.lgid}>
                            <Card className="shadow-sm border-0 rounded-3 h-100 text-center">
                                <Card.Body className="p-3">
                                    <img
                                        src={imageSrc}
                                        alt="User"
                                        className="rounded-circle border"
                                        style={{
                                            width: "80px",
                                            height: "80px",
                                            objectFit: "cover",
                                            marginBottom: "10px",
                                        }}
                                        onError={(e) => { e.target.onerror = null; e.target.src = "/img/default.png"; }}
                                    />

                                    <Card.Title
                                        className="fw-bold mb-1"
                                        style={{ fontSize: "1rem" }}
                                    >
                                        {user.name}
                                    </Card.Title>
                                    <Card.Text className="text-muted small mb-2">
                                        {user.role || ""}
                                    </Card.Text>

                                    <div className="small mb-3 text-start px-3">
                                        <div>
                                            <strong>ID:</strong> {user.lgid}
                                        </div>
                                        <div>
                                            <strong>Email:</strong> {user.email}
                                        </div>
                                        <div>
                                            <strong>Year:</strong> {user.year || "—"}
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-center gap-2">
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleEdit(user)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDelete(user)}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        );
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-center align-items-center flex-column mb-4">
                <h3 className="fw-bold text-success mb-3">Technician Management</h3>
                <Button
                    variant="success"
                    size="sm"
                    className="rounded-pill shadow-sm px-3 py-2"
                    onClick={() => setShowModal(true)}
                >
                    + Add Technician
                </Button>
            </div>

            <ITSDAddUserModal show={showModal} onClose={() => setShowModal(false)} />

            {renderCards()}

            {/* Edit Modal (only one) */}
            <Modal show={showEdit} onHide={handleCloseEdit} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Technician</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Form>
                            <div className="text-center mb-3">
                                <img
                                    src={preview || "/img/default.png"}
                                    alt="Profile Preview"
                                    className="rounded-circle shadow-sm"
                                    style={{ width: "120px", height: "120px", objectFit: "cover" }}
                                />
                                <Form.Group controlId="formFile" className="mt-3">
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={handleProfileChange}
                                    />
                                </Form.Group>
                            </div>

                            <Form.Group className="mb-2">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={formData.name || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    value={formData.email || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>Role</Form.Label>
                                <Form.Control
                                    type="text"
                                    value="Technician"
                                    disabled
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseEdit}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleUpdate}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Modal (only one) */}
            <Modal show={showDelete} onHide={handleCloseDelete} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete{" "}
                    <strong>{selectedUser?.lgid}</strong>?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDelete}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={confirmDelete}>
                        Yes, Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
