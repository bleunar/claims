import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { FaBars, FaHome, FaNetworkWired, FaClipboardList, FaUserEdit } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, logout } = useAuth();
  const [user, setUser] = useState(authUser);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/get_user');
        if (response.data && !response.data.error) {
          setUser(response.data);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const sidebarLinks = [
    { icon: <FaHome />, label: "Dashboard", path: "/admin" },
    { icon: <FaNetworkWired />, label: "Labs & Computers", path: "/admin/labs" },
    { icon: <FaClipboardList />, label: "Reports", path: "/admin/reports" },
    { icon: <FaUserEdit />, label: "Users", path: "/admin/users" },
  ];

  return (
    <div style={{ height: "100vh", fontFamily: "Cambria, Georgia, serif", backgroundColor: "#f6f8fa" }}>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "60px",
          backgroundColor: "#004d26",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 1rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isMobile && (
            <FaBars
              size={22}
              style={{ cursor: "pointer", color: "#FFCC00" }}
              onClick={toggleSidebar}
            />
          )}
          {!isMobile && (
            <img
              src="/img/image.png"
              alt="CLAIMS Logo"
              style={{ height: "40px" }} // adjust as needed
            />
          )}
        </div>
      </header>

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : isMobile ? "-280px" : "0",
          width: "280px",
          height: "100%",
          backgroundColor: "#003d1f",
          paddingTop: "60px",
          boxShadow: "2px 0 12px rgba(0,0,0,0.25)",
          transition: "all 0.3s ease",
          zIndex: 900,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              margin: "1rem",
              padding: "1.5rem",
              borderRadius: "12px",
              backgroundColor: "#004d26",
              boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
              textAlign: "center",
            }}
          >
            <div style={{ position: "relative", width: "100px", margin: "0 auto" }}>
              <img
                src={user?.profile ? `/uploads/${user.profile}` : "/img/default.png"}
                alt="Profile"
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #FFCC00",
                }}
                onError={(e) => { e.target.onerror = null; e.target.src = "/img/default.png"; }}
              />
            </div>
            <h5 style={{ color: "white", margin: "0.5rem 0 0.25rem 0", fontWeight: "700", fontSize: "1.1rem" }}>
              {user?.name || "Loading..."}
            </h5>
            <p style={{ color: "#ccc", fontSize: "0.9rem", margin: "0 0 1rem 0" }}>{user?.role || "Fetching role..."}</p>

            <div
              onClick={() => navigate("/admin/edit")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.8rem 1.2rem",
                borderRadius: "10px",
                backgroundColor: location.pathname === "/admin/edit" ? "#FFCC00" : "#004d26",
                color: location.pathname === "/admin/edit" ? "#003d1f" : "#ffffff",
                fontWeight: "600",
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 6px 15px rgba(0,0,0,0.2)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = "rgba(255,204,0,0.15)"}
              onMouseOut={e =>
                e.currentTarget.style.backgroundColor = location.pathname === "/admin/edit" ? "#FFCC00" : "#004d26"
              }
            >
              <FaUserEdit size={18} />
              Edit Profile
            </div>

          </div>
          {/* Sidebar Navigation */}
          <nav style={{ marginTop: "1rem" }}>
            <ul style={{ listStyle: "none", padding: "0 1rem" }}>
              {sidebarLinks.map((link, i) => {
                const isActive = location.pathname === link.path;
                return (
                  <li key={i} style={{ marginBottom: "0.75rem" }}>
                    <button
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem 1rem",
                        borderRadius: "10px",
                        border: "none",
                        backgroundColor: isActive ? "#FFCC00" : "#004d26",
                        color: isActive ? "#003d1f" : "#ffffff",
                        fontWeight: isActive ? "700" : "500",
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                        boxShadow: isActive ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                      }}
                      onClick={() => {
                        navigate(link.path);
                        if (isMobile) setSidebarOpen(false);
                      }}
                      onMouseOver={e => !isActive && (e.currentTarget.style.backgroundColor = "rgba(255,204,0,0.15)")}
                      onMouseOut={e => !isActive && (e.currentTarget.style.backgroundColor = "#004d26")}
                    >
                      {React.cloneElement(link.icon, { size: 18 })}
                      {link.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div
          style={{
            padding: "0.8rem 1rem",
            margin: "1rem",
            borderRadius: "10px",
            backgroundColor: "#cc0000",
            color: "#fff",
            fontWeight: "600",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
          onClick={handleLogout}
          onMouseOver={e => (e.currentTarget.style.backgroundColor = "#bf101cff")}
          onMouseOut={e => (e.currentTarget.style.backgroundColor = "#cc0000")}
        >
          Logout
        </div>
      </aside>

      {/* Main Content */}
      <main
        style={{
          marginLeft: isMobile ? "0" : "280px",
          marginTop: "60px",
          padding: "25px",
          minHeight: "100vh",
          backgroundColor: "#f6f8fa",
          transition: "all 0.3s ease",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
