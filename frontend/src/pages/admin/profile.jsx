import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";

function ViewProfile() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(authUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await api.get('/get_user');
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #e6f2ff, #f0f2f5)",
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #e6f2ff, #f0f2f5)",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Inter', sans-serif",
        padding: "3rem",
      }}
    >
      <div
        style={{
          width: "500px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "2rem",
        }}
      >
        {/* Profile Picture */}
        <img
          src={user?.profile ? `${import.meta.env.VITE_API_URL}/uploads/${user.profile}` : "/img/default.png"}
          alt="Profile"
          style={{
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "4px solid #00C49a",
            marginBottom: "1rem",
          }}
        />
        <h2 style={{ margin: "0.5rem 0", fontWeight: "700", fontSize: "1.6rem" }}>
          {user?.name || "Loading..."}
        </h2>
        <p style={{ margin: "0.25rem 0", fontSize: "1rem", opacity: 0.85 }}>
          {user?.role || "Admin"}
        </p>

        {/* Profile Details */}
        <div
          style={{
            marginTop: "2rem",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <DetailRow label="ID" value={user?.lgid || "N/A"} />
          <DetailRow label="Email" value={user?.email || "N/A"} />
          <DetailRow label="Role" value={user?.role || "Admin"} />
        </div>
      </div>
    </div>
  );
}

const DetailRow = ({ label, value }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: "1rem",
      color: "#333",
      padding: "0.8rem 1rem",
      borderRadius: "12px",
      backgroundColor: "#f7f9fb",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
      transition: "all 0.3s ease",
    }}
    onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#e6f2ff")}
    onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#f7f9fb")}
  >
    <span style={{ fontWeight: "600", color: "#00C49a" }}>{label}:</span>
    <span>{value}</span>
  </div>
);

export default ViewProfile;
