import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { FaPaperPlane } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import "./Technician.css";

export default function TechnicianLogs() {
  const [TechnicianLogs, setTechnicianLogs] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [selectedReports, setSelectedReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [title, setTitle] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [alreadySentModal, setAlreadySentModal] = useState(false);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // --- Check session ---
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    } else if (user) {
      setUserPosition(user.role);
      setUserEmail(user.email);
    }
  }, [isAuthenticated, user, navigate]);

  // --- Fetch logs ---
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get('/get_technician_logs');
        // Map backend keys to frontend structure
        const mappedLogs = response.data.map(log => ({
          fix_id: log.id,
          report_id: log.report_id,
          solution: log.action_taken,
          technician_email: log.technician_name, // Assuming name/email is stored here
          timestamp: log.created_at,
          status: log.status_after,
          issue_found: {
            lab: log.lab_name,
            PC_Number: log.pc_name,
            notes: log.issue_description,
            status: log.initial_status
          },
          sent: 0 // 'sent' column removed, default to 0 or handle differently
        }));
        setTechnicianLogs(mappedLogs);
      } catch (error) {
        console.error('Error fetching logs:', error);
        toast.error('Failed to load technician logs');
      }
    };
    fetchLogs();
  }, []);

  // --- Filter and sort ---
  const filteredReports = TechnicianLogs.filter(
    (r) =>
      (r.fix_id || "").toLowerCase().includes(filterText.toLowerCase()) ||
      (r.solution_made || "").toLowerCase().includes(filterText.toLowerCase()) ||
      (r.report_id || "").toLowerCase().includes(filterText.toLowerCase()) ||
      (r.status || "").toLowerCase().includes(filterText.toLowerCase()) ||
      (r.technician_email || "").toLowerCase().includes(filterText.toLowerCase()) ||
      (r.timestamp || "").toLowerCase().includes(filterText.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // --- Handle selecting reports ---
  const handleSelectReport = (report) => {
    setSelectedReports((prevSelected) =>
      prevSelected.includes(report)
        ? prevSelected.filter((r) => r !== report)
        : [...prevSelected, report]
    );
  };

  // --- Handle Send Button ---
  const handleSendButton = () => {
    if (!showCheckboxes) {
      toast.warning("Please click 'Select Logs' first to choose logs.");
      return;
    }
    if (selectedReports.length === 0) {
      toast.warning("Please select at least one log.");
      return;
    }
    setShowModal(true);
  };

  // --- Handle submit modal (Send Email) ---
  const handleSubmit = async () => {
    if (!title) {
      toast.error("Please fill in a title");
      return;
    }

    try {
      const response = await api.post('/technician_send_report_email', {
        data: {
          title,
          issue_report: selectedReports,
          position: userPosition,
          userEmail: userEmail,
        },
      });

      toast.success("Logs email sent successfully!");
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send email';
      toast.error(errorMessage);
    }

    setShowModal(false);
    setShowCheckboxes(false);
    setSelectedReports([]);
  };

  // --- Table columns ---
  const columns = [
    ...(showCheckboxes
      ? [
        {
          name: "",
          cell: (row) => (
            <div
              style={{ display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}
              onClick={() => {
                if (row.sent === 1) {
                  setAlreadySentModal(true);
                  return;
                }
                handleSelectReport(row);
              }}
            >
              <input
                type="checkbox"
                checked={selectedReports.includes(row)}
                readOnly
                style={{
                  pointerEvents: "none",
                  opacity: row.sent === 1 ? 0.5 : 1
                }}
              />
            </div>
          ),
          width: "70px",
        },
      ]
      : []),
    { name: "Report ID", selector: (row) => row.report_id, sortable: true },
    { name: "Fix ID", selector: (row) => row.fix_id, sortable: true },
    { name: "Lab", selector: (row) => row.issue_found.lab, sortable: true },
    { name: "PC Number", selector: (row) => row.issue_found.PC_Number, sortable: true },
    { name: "Notes", selector: (row) => row.issue_found.notes, sortable: true },
    { name: "Status", selector: (row) => row.issue_found.status, sortable: true },
    { name: "Solution Made", selector: (row) => row.solution || "—" },
    { name: "Technician Email", selector: (row) => row.technician_email },
    { name: "Date", selector: (row) => new Date(row.timestamp).toLocaleString(), sortable: true },
  ];

  const customStyles = {
    headRow: { style: { backgroundColor: "#006633", color: "#fff" } },
  };

  return (
    <div className="container py-5">
      <h1 className="text-center mb-4" style={{ color: "#006633" }}>Technician Logs Dashboard</h1>

      <div className="d-flex justify-content-between mb-3">
        <button
          className={`btn ${showCheckboxes ? "btn-secondary" : "btn-success"}`}
          onClick={() => {
            setShowCheckboxes(!showCheckboxes);
            setSelectedReports([]);
          }}
        >
          {showCheckboxes ? "Cancel Selection" : "Select Logs"}
        </button>

        <input
          type="text"
          className="form-control"
          placeholder="Search logs..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ maxWidth: "300px" }}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredReports}
        pagination
        highlightOnHover
        responsive
        customStyles={customStyles}
      />

      {/* Floating Send Button */}
      <button
        className="btn btn-success rounded-circle p-3"
        onClick={handleSendButton}
        style={{
          position: "fixed",
          bottom: "30px",
          right: "30px",
          width: "60px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
        }}
      >
        <FaPaperPlane size={20} />
      </button>

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content p-4">
              <h4 className="mb-3 text-center" style={{ color: "#006633" }}>Send Log Report</h4>
              <p><strong>User Position:</strong> {userPosition || "Unknown"}</p>

              <div className="d-flex flex-column gap-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="table-responsive border rounded mt-3" style={{ maxHeight: "250px", overflowY: "auto" }}>
                  <table className="table table-striped table-bordered">
                    <thead className="table-success">
                      <tr>
                        <th>Report ID</th>
                        <th>Fix ID</th>
                        <th>PC Number</th>
                        <th>Lab</th>
                        <th>Status</th>
                        <th>Notes</th>
                        <th>Solution Made</th>
                        <th>Technician Email</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReports.map((r, i) => (
                        <tr key={i}>
                          <td>{r.report_id}</td>
                          <td>{r.fix_id}</td>
                          <td>{r.issue_found.PC_Number}</td>
                          <td>{r.issue_found.lab}</td>
                          <td>{r.issue_found.status}</td>
                          <td>{r.issue_found.notes}</td>
                          <td>{r.solution}</td>
                          <td>{r.technician_email}</td>
                          <td>{r.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-end mt-4">
                <button className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handleSubmit}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Already Sent Modal */}
      {alreadySentModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-4 text-center">
              <div className="alert alert-warning mb-3">
                ⚠️ This log has already been sent!
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setAlreadySentModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
