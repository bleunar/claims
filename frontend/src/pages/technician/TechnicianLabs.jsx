import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import LabGrid from "../admin/components/LabGrid";
import LabDetail from "../admin/components/LabDetail";
import "../admin/components/labs.css";

export default function TechnicianLabs() {
  const [selectedLab, setSelectedLab] = useState(null);
  const [labs, setLabs] = useState([]);
  const [computers, setComputers] = useState([]);
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

        console.log('Labs fetched:', labsResponse.data);
        console.log('Computers fetched:', computersResponse.data);

        // Normalize computers data to ensure all required fields exist
        const normalizedComputers = computersResponse.data.map(c => ({
          id: c.id,
          pc_name: c.pc_name || c.name,
          name: c.name || c.pc_name,
          lab_id: c.lab_id,
          lab_name: c.lab_name,
          parts: c.specs || c.parts || {},
          specs: c.specs || c.parts || {},
          other_parts: c.other_parts || {},
          pcNumber: c.pc_name || c.name || "",
          lab: c.lab_name || ""
        }));

        console.log('Normalized computers:', normalizedComputers);

        setLabs(labsResponse.data);
        setComputers(normalizedComputers);
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

  const addComputer = (comp) => {
    // Normalize new computer before adding
    const normalized = {
      id: comp.id,
      pc_name: comp.pc_name || comp.name,
      name: comp.name || comp.pc_name,
      lab_id: comp.lab_id,
      lab_name: comp.lab_name,
      parts: comp.specs || comp.parts || {},
      specs: comp.specs || comp.parts || {},
      other_parts: comp.other_parts || {},
      pcNumber: comp.pc_name || comp.name || "",
      lab: comp.lab_name || ""
    };
    setComputers(prev => [...prev, normalized]);
  };

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
    </div>
  );
}
