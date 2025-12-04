import React from 'react';
import { Container, Card, Button } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { FaSignOutAlt, FaTools } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ITSDComingSoon() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <Container>
        <Card
          className="shadow-lg border-0"
          style={{
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Card.Body className="text-center p-5">
            {/* Header */}
            <div className="mb-4">
              <div
                className="mx-auto mb-3"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FaTools size={32} color="white" />
              </div>
              <h1
                className="display-4 fw-bold mb-2"
                style={{ color: "#667eea" }}
              >
                ITSD Portal
              </h1>
              <h5 className="text-muted mb-4">
                Information Technology Support Division
              </h5>
            </div>

            {/* Coming Soon Message */}
            <div className="mb-5">
              <div
                className="display-1 mb-3"
                style={{ color: "#667eea", opacity: 0.3 }}
              >
                🚧
              </div>
              <h2 className="h3 mb-3" style={{ color: "#495057" }}>
                Coming Soon
              </h2>
              <p className="lead text-muted mb-4">
                We're working hard to bring you a comprehensive IT support dashboard.
                This portal will provide advanced tools for system administration,
                network management, and technical support operations.
              </p>

              {/* Features Preview */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <Card className="h-100 border-0 shadow-sm">
                    <Card.Body className="text-center p-3">
                      <div className="text-primary mb-2">🔧</div>
                      <small className="text-muted">System Tools</small>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-4">
                  <Card className="h-100 border-0 shadow-sm">
                    <Card.Body className="text-center p-3">
                      <div className="text-primary mb-2">📊</div>
                      <small className="text-muted">Analytics</small>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-4">
                  <Card className="h-100 border-0 shadow-sm">
                    <Card.Body className="text-center p-3">
                      <div className="text-primary mb-2">🎯</div>
                      <small className="text-muted">Advanced Support</small>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="border-top pt-4">
              <div className="mb-3">
                <p className="text-muted mb-1">Logged in as:</p>
                <p className="fw-bold mb-1">{user?.name || 'Unknown User'}</p>
                <small className="text-muted">{user?.email || 'No email'}</small>
              </div>

              <Button
                variant="outline-primary"
                size="lg"
                onClick={handleLogout}
                className="px-4 py-2"
                style={{
                  borderRadius: "10px",
                  fontWeight: "500",
                }}
              >
                <FaSignOutAlt className="me-2" />
                Logout
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-top">
              <small className="text-muted">
                Contact your system administrator for more information about the ITSD portal development.
              </small>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
