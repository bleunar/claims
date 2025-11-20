import React, { useState, useEffect } from "react";
import {
  Tab,
  Nav,
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
import AddUserModal from "./AddUserModal";
import "./dean.css";

export default function Users() {
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
        setUsers(response.data);
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
        : "/default.png"
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
        `/users/${selectedUser.lgid}`,
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
      const response = await api.delete(`/users/${selectedUser.lgid}`);
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
  const renderCards = (filterRole = null) => {
    const filteredUsers = filterRole
      ? users.filter((u) => u.role === filterRole)
      : users;

    return (
      <Row className="g-3">
        {filteredUsers.map((user) => {
          const imageSrc = user.profile
            ? `http://localhost:5000/uploads/${user.profile}`
            : "/default.png";

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
        <h3 className="fw-bold text-success mb-3">User Management</h3>
        <Button
          variant="success"
          size="sm"
          className="rounded-pill shadow-sm px-3 py-2"
          onClick={() => setShowModal(true)}
        >
          + Add User
        </Button>
      </div>

      <AddUserModal show={showModal} onClose={() => setShowModal(false)} />

      <Tab.Container defaultActiveKey="all">
        <Nav variant="tabs" className="justify-content-center mb-4">
          {["all", "admin", "dean", "itsd", "technician"].map((role) => (
            <Nav.Item key={role}>
              <Nav.Link eventKey={role} className="px-4 py-2 fw-semibold">
                {role === "all" ? "All Users" : role.charAt(0).toUpperCase() + role.slice(1)}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="all">{renderCards()}</Tab.Pane>
          <Tab.Pane eventKey="admin">{renderCards("admin")}</Tab.Pane>
          <Tab.Pane eventKey="dean">{renderCards("dean")}</Tab.Pane>
          <Tab.Pane eventKey="itsd">{renderCards("itsd")}</Tab.Pane>
          <Tab.Pane eventKey="technician">{renderCards("technician")}</Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Edit Modal (only one) */}
      <Modal show={showEdit} onHide={handleCloseEdit} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <Form>
              <div className="text-center mb-3">
                <img
                  src={preview || "/default.png"}
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
                <Form.Select
                  value={formData.role || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="">Select Role</option>
                  <option value="dean">Dean</option>
                  <option value="itsd">ITSD</option>
                  <option value="technician">Technician</option>
                </Form.Select>
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
