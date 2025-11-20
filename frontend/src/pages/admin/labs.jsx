import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import LabGrid from "./components/LabGrid";
import AddLabModal from "./components/AddLabModal";
import LabDetail from "./components/LabDetail";
import "./components/labs.css";

export default function App() {
  const [selectedLab, setSelectedLab] = useState(null);
  const [labs, setLabs] = useState([]);
  const [computers, setComputers] = useState([]);
  const [showAddLab, setShowAddLab] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Check session
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Fetch labs and computers
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [labsResponse, computersResponse] = await Promise.all([
          api.get('/get_laboratory'),
          api.get('/get_computers')
        ]);
        setLabs(labsResponse.data);
        setComputers(computersResponse.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load laboratories and computers');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const addLab = (lab) => setLabs(prev => [...prev, lab]);
  const addComputer = (comp) => setComputers(prev => [...prev, comp]);

  if (loading) {
    return (
      <div style={{ padding: 40, background: "#f1f3f6", minHeight: "100vh", textAlign: "center" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading laboratories...</p>
      </div>
    );
  }

  return (
  <div style={{ padding: 40, background: "#f1f3f6", minHeight: "100vh" }}>
      {!selectedLab && (
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <h2 style={{ marginBottom: 20, color: "#006633" }}>
            Laboratories and Computers
          </h2>
          <button
            onClick={() => setShowAddLab(true)}
            className="btn"
            style={{ backgroundColor: "#006633", color: "white" }}
          >
            + Add Laboratory
          </button>
        </div>
      )}
      {!selectedLab ? (
        <LabGrid labs={labs} selectLab={setSelectedLab} />
      ) : (
        <LabDetail
          lab={selectedLab}
          computers={computers}
          back={() => setSelectedLab(null)}
          addComputer={addComputer}
        />
      )}
      {showAddLab && (
        <AddLabModal addLab={addLab} onClose={() => setShowAddLab(false)} />
      )}
    </div>
  );

  
}
