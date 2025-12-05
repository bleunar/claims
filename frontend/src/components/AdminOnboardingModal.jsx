import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../utils/api';
import 'bootstrap/dist/css/bootstrap.min.css';

const AdminOnboardingModal = ({ show, onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.toLowerCase() === 'admin') {
      newErrors.name = 'Cannot use "admin" as name. Please choose a different name.';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (formData.email.toLowerCase() === 'admin@example.com') {
      newErrors.email = 'Cannot use default email. Please use your actual email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.toLowerCase() === 'changeme') {
      newErrors.password = 'Cannot use "changeme" as password. Please choose a secure password.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/update_default_admin', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Call onComplete to logout and redirect to login
        onComplete();
      } else {
        toast.error(response.data.message || 'Failed to update credentials');
      }
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update admin credentials';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show={show}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
    >
      <Modal.Body>
        <Alert variant="warning">
          <Alert.Heading>Default Admin Account Detected</Alert.Heading>
          <p className='mb-0'>
            You are currently using the default admin credentials. For security reasons,
            you must update your account information before proceeding.
          </p>
        </Alert>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Full Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              isInvalid={!!errors.name}
              placeholder="Enter your full name"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Cannot use "admin" as your name
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email Address <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              isInvalid={!!errors.email}
              placeholder="Enter your email address"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.email}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Cannot use admin@example.com
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>New Password <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              isInvalid={!!errors.password}
              placeholder="Enter a secure password"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.password}
            </Form.Control.Feedback>
            <Form.Text className="text-muted">
              Minimum 6 characters. Cannot use "changeme"
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Confirm Password <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              isInvalid={!!errors.confirmPassword}
              placeholder="Confirm your password"
              disabled={loading}
            />
            <Form.Control.Feedback type="invalid">
              {errors.confirmPassword}
            </Form.Control.Feedback>
          </Form.Group>

          <div className="text-muted text-center mt-5 mb-2">
            After updating, you will be logged out and need to login with your new credentials.
          </div>

          <div className="d-grid">
            <Button
              variant="success"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating...
                </>
              ) : (
                'Update Credentials & Continue'
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>

      <Modal.Footer className="bg-light">

      </Modal.Footer>
    </Modal >
  );
};

export default AdminOnboardingModal;
