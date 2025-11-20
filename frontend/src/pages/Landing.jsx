import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

function LandingPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(loginEmail, loginPassword);

      if (result.success) {
        const userRole = result.user.role;

        // Check if user is authorized
        if (userRole !== "admin" && userRole !== "itsd" && userRole !== "dean" && userRole !== "technician") {
          toast.error("Only authorized users can log in.");
          return;
        }

        // If user needs onboarding, modal will show automatically
        // No need to navigate - onboarding modal handles this
        if (!result.needsOnboarding) {
          // Navigate based on role only if no onboarding needed
          if (userRole === "technician") {
            navigate("/technician");
          } else if (userRole === "itsd") {
            navigate("/itsd");
          } else if (userRole === "admin") {
            navigate("/admin");
          } else if (userRole === "dean") {
            navigate("/dean");
          }
        }
        // If needsOnboarding is true, modal will show and handle navigation
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An unexpected error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative"
      style={{
        fontFamily: "Cambria, Georgia, serif",
        backgroundColor: "#001a0d",
        overflow: "hidden",
      }}
    >
   
     

  
      <div
        style={{
          backgroundImage: "url('/img/uibg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(6px) brightness(0.5)",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
        }}
      ></div>

      
      <div
        style={{
          backgroundColor: "rgba(0, 30, 10, 0.55)", 
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0.5,
        }}
      ></div>

      {/* Login Box */}
      <div
        className="card shadow-lg text-center p-4 p-md-5"
        style={{
          maxWidth: "400px",
          width: "100%",
          borderRadius: "18px",
          background: "rgba(0, 40, 20, 0.92)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 204, 0, 0.25)",
          zIndex: 1,
          color: "#fff",
        }}
      >
        <div className="d-flex justify-content-center mb-3">
          <img
            src="/img/black.png"
            alt="Claims Logo"
            style={{
              width: "150px",
              borderRadius: "8px",
            }}
          />
        </div>
       <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",    
            marginBottom: "20px",     
          }}
        >
          <img
            src="/img/image.png"
            alt="Claims"
            style={{
              width: "150px",
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(1px 1px 3px rgba(0,0,0,0.3))",
            }}
          />
        </div>

        <p
          style={{
            color: "#ffffffcc",
            fontSize: "0.95rem",
            marginBottom: "1.5rem",
          }}
        >
          Please log in to continue.
        </p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            className="form-control mb-3"
            placeholder="Email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            required
            style={{
              borderColor: "#FFCC00",
              backgroundColor: "#002912",
              color: "#fff",
              borderRadius: "10px",
              padding: "10px",
            }}
            onFocus={(e) => (e.target.style.boxShadow = "0 0 6px #FFCC00")}
            onBlur={(e) => (e.target.style.boxShadow = "none")}
          />

          <div className="position-relative mb-3">
            <input
              type={showLoginPassword ? "text" : "password"}
              className="form-control"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              style={{
                borderColor: "#FFCC00",
                backgroundColor: "#002912",
                color: "#fff",
                borderRadius: "10px",
                padding: "10px",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 6px #FFCC00")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
            />
            <span
              className="position-absolute end-0 top-50 translate-middle-y pe-3"
              style={{ cursor: "pointer", color: "#FFCC00" }}
              onClick={() => setShowLoginPassword(!showLoginPassword)}
            >
              {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button
            type="submit"
            className="btn w-100 mb-3"
            disabled={loading}
            style={{
              backgroundColor: "#FFCC00",
              color: "#003319",
              fontWeight: "bold",
              border: "none",
              borderRadius: "10px",
              transition: "0.3s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#e6b800")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#FFCC00")
            }
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>

      
      <style>{`
        input::placeholder {
          color: #FFCC00 !important;
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
