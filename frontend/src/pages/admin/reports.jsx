import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { FaPaperPlane } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import "./components/labs.css";

export default function Reports() {
  const [adminReports, setAdminReports] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [selectedReports, setSelectedReports] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [title, setTitle] = useState("");
  const [userPosition, setUserPosition] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [emailStatus, setEmailStatus] = useState("idle");
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
      setUserName(user.name || "Unknown");
    }
  }, [isAuthenticated, user, navigate]);

  // --- Fetch reports ---
  const fetchReports = async () => {
    try {
      const response = await api.get('/get_admin_computer_reports');
      // Map backend keys to frontend structure
      const mappedData = response.data.map(r => ({
        ...r,
        item: r.pc_name !== "Unknown" ? r.pc_name : (r.computer_id || "Unknown"),
        lab: r.lab_name,
        notes: r.issue_description,
        date: r.created_at,
        // Map status to frontend capitalized format
        status: r.status === 'not_operational' ? 'Notoperational' :
          r.status === 'in_progress' ? 'In Progress' :
            r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Unknown'
      }));

      const sortedData = mappedData.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAdminReports(sortedData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // --- Filter reports ---
  const filteredReports = adminReports.filter((r) => {
    const lowerFilter = filterText.toLowerCase();
    const formattedDate = new Date(r.date).toLocaleString().toLowerCase();
    return (
      (r.item || "").toLowerCase().includes(lowerFilter) ||
      (r.lab || "").toLowerCase().includes(lowerFilter) ||
      (r.status || "").toLowerCase().includes(lowerFilter) ||
      (r.notes || "").toLowerCase().includes(lowerFilter) ||
      formattedDate.includes(lowerFilter)
    );
  });

  // --- Select / Deselect reports ---
  const handleSelectReport = (report) => {
    setSelectedReports((prev) =>
      prev.includes(report)
        ? prev.filter((r) => r !== report)
        : [...prev, report]
    );
  };

  // --- Handle Send Button ---
  const handleSendButton = () => {
    if (!showCheckboxes) {
      toast.warning("Please click 'Select Reports' first to choose reports.");
      return;
    }
    if (selectedReports.length === 0) {
      toast.warning("Please select at least one report.");
      return;
    }
    setShowModal(true);
  };

  // --- Email summary ---
  const summaryText = selectedReports.map((r) => ({
    pc: r.item,
    lab: r.lab,
    status: r.status,
    notes: r.notes || "—",
    com_id: r.id,
  }));

  // --- Handle Submit ---
  const handleSubmit = async () => {
    if (!title) {
      toast.error("Please fill in the title");
      return;
    }
    setEmailStatus("sending");
    try {
      const response = await api.post('/send_report_email', {
        title,
        summary: summaryText,
        position: userPosition,
        userEmail,
        userName,
      });

      setEmailStatus("success");
      toast.success('Report email sent successfully');
      fetchReports();
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailStatus("error");
      toast.error('Failed to send report email');
    }
    setShowModal(false);
    setShowStatusModal(true);
    setSelectedReports([]);
    setTitle("");
    setShowCheckboxes(false);
  };

  // --- Table columns ---
  const columns = [
    ...(showCheckboxes
      ? [
        {
          name: "",
          cell: (row) => (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
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
                  opacity: row.sent === 1 ? 0.5 : 1,
                }}
              />
            </div>
          ),
          width: "70px",
        },
      ]
      : []),
    { name: "PC Number", selector: (row) => row.item, sortable: true },
    { name: "Lab", selector: (row) => row.lab, sortable: true },
    {
      name: "Status",
      selector: (row) => row.status,
      sortable: true,
      cell: (row) => {
        let bgColor = "#f8f9fa";
        let textColor = "#000";

        switch (row.status) {
          case "Operational":
          case "Resolved":
            bgColor = "#006633";
            textColor = "#fff";
            break;
          case "Warning":
          case "Notoperational":
          case "In Progress":
            bgColor = "#FFCC00";
            textColor = "#000";
            break;
          case "Damaged":
            bgColor = "#dc3545";
            textColor = "#fff";
            break;
          case "Missing":
            bgColor = "#6c757d";
            textColor = "#fff";
            break;
          case "Pending":
            bgColor = "#17a2b8"; // Info blue/cyan
            textColor = "#fff";
            break;
          default:
            bgColor = "#e2e3e5";
            textColor = "#000";
        }

        return (
          <span
            style={{
              backgroundColor: bgColor,
              color: textColor,
              padding: "3px 7px",
              borderRadius: "5px",
              fontWeight: "500",
              fontSize: "0.85rem"
            }}
          >
            {row.status}
          </span>
        )
      },
    },
    { name: "Date", selector: (row) => new Date(row.date).toLocaleString(), sortable: true },
    { name: "Notes", selector: (row) => row.notes || "—" },
  ];

  const customStyles = { headRow: { style: { backgroundColor: "#006633", color: "#fff" } } };

  return (
    <div className="container py-5">
      <h1 className="text-center mb-4" style={{ color: "#006633" }}>
        Admin Reports Dashboard
      </h1>

      <div className="d-flex justify-content-between mb-3">
        <button
          className={`btn ${showCheckboxes ? "btn-secondary" : "btn-success"}`}
          onClick={() => {
            setShowCheckboxes(!showCheckboxes);
            setSelectedReports([]);
          }}
        >
          {showCheckboxes ? "Cancel Selection" : "Select Reports"}
        </button>

        <input
          type="text"
          className="form-control"
          placeholder="Search reports..."
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


      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content p-4">
              <h4 className="mb-3 text-center" style={{ color: "#006633" }}>Send Report</h4>
              <p><strong>User Position:</strong> {userPosition || "Unknown"}</p>
              <p><strong>Name of Sender:</strong> {userName || "Unknown"}</p>

              <input
                type="text"
                className="form-control mb-3"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={emailStatus === "sending"}
              />

              <div className="table-responsive border rounded" style={{ maxHeight: "250px", overflowY: "auto" }}>
                <table className="table table-striped table-bordered">
                  <thead className="table-success">
                    <tr>
                      <th>#</th>
                      <th>PC</th>
                      <th>Lab</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReports.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{r.item}</td>
                        <td>{r.lab}</td>
                        <td>{r.status}</td>
                        <td>{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-end mt-4">
                <button className="btn btn-secondary me-2" onClick={() => setShowModal(false)} disabled={emailStatus === "sending"}>Cancel</button>
                <button className="btn btn-success" onClick={handleSubmit} disabled={emailStatus === "sending"}>
                  {emailStatus === "sending" ? "Sending..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {showStatusModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-4 text-center">
              {emailStatus === "success" ? (
                <div className="alert alert-success">✅ Email sent successfully!</div>
              ) : (
                <div className="alert alert-danger">❌ Email failed to send. Try again.</div>
              )}
              <button
                className="btn btn-primary mt-3"
                onClick={() => {
                  setShowStatusModal(false);
                  setEmailStatus("idle");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {alreadySentModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p-4 text-center">
              <div className="alert alert-warning mb-3">
                ⚠️ You have already sent this report via email.
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
