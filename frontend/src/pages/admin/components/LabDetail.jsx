import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaDesktop,
  FaMouse,
  FaKeyboard,
  FaHeadphones,
  FaServer,
  FaPlug,
  FaWifi,
  FaTimes,
  FaTrashAlt,

  FaEdit,
  FaHashtag,
} from "react-icons/fa";
import api from "../../../utils/api";
import { toast } from "react-toastify";
import AddComputerModal from "./AddComputerModal";

const statusColors = {
  operational: { color: "#006633", label: "Operational", priority: 0 },
  notOperational: { color: "#FFCC00", label: "Not Operational", priority: 1 },
  damaged: { color: "#dc3545", label: "Damaged", priority: 2 },
  missing: { color: "#6c757d", label: "Missing", priority: 3 },
};

function StatusButtons({ part, compId, status, setStatus }) {
  const statuses = ["operational", "notOperational", "damaged", "missing"];
  const [hovered, setHovered] = useState(null);

  // Map numeric status to string if needed
  const currentStatus = typeof status === 'number' ? statuses[status - 1] : status;

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6 }}>
      {statuses.map((s) => (
        <button
          key={s}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: `1px solid ${statusColors[s].color}`,
            backgroundColor: currentStatus === s ? statusColors[s].color : "transparent",
            cursor: "pointer",
            boxShadow: hovered === s ? `0 0 6px ${statusColors[s].color}` : "none",
            transition: "all 0.2s",
          }}
          onClick={() => setStatus(compId, part, s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(null)}
          title={statusColors[s].label}
        />
      ))}
    </div>
  );
}

export default function LabDetail({ lab, computers, back, addComputer }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Detect role based on current path
  const currentRole = location.pathname.startsWith('/itsd') ? 'itsd' :
                      location.pathname.startsWith('/technician') ? 'technician' : 'admin';
  const [statuses, setStatuses] = useState({});
  const [selectedPC, setSelectedPC] = useState(null);
  const [showAddComputer, setShowAddComputer] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [deletePC, setDeletePC] = useState(null);
  const [editPC, setEditPC] = useState(null);
  const [selectedPart, setSelectedPart] = useState(true);
  const [selectedPCs, setSelectedPCs] = useState([]);
  const [otherParts, setotherParts] = useState({});
  const [selectedStatus, setSelectedStatus] = useState([]);


  console.log("otherParts in LabDetail:", selectedPC)
  if (selectedPC && otherParts[selectedPC.id]) {
    console.log(otherParts[selectedPC.id]);
    Object.entries(otherParts[selectedPC.id]).forEach(([partName, status], idx) => {
      console.log('Other part:', partName, 'status:', status, 'idx:', idx);
    });
  }




  const [editData, setEditData] = useState([]);
  const [showOtherParts, setShowOtherParts] = useState(true);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);
  const getNextStatus = (current) => {
    const keys = Object.keys(statusColors);
    const idx = keys.indexOf(current);
    return keys[(idx + 1) % keys.length];
  };
  console.log("editData.otherParts", editData)
  console.log("showOtherParts", otherParts)

  useEffect(() => {
    if (!editPC) return;

    const fetchEditData = async () => {
      try {
        const response = await api.get('/get_edit_data');
        const data = response.data;
        console.log("Fetched edit data array:", data);

        const pcData = data.find((item) => item.id === editPC.id);

        if (!pcData) {
          console.warn("No PC found for ID:", editPC.id);
          return;
        }

        setEditData({
          com_id: pcData.id,
          lab_id: pcData.lab_id,
          pcNumber: pcData.pc_name || "",
          parts: pcData.specs || {},
          otherParts: Array.isArray(pcData.other_parts) ? pcData.other_parts : Object.entries(pcData.other_parts || {}).map(([name, serial]) => ({
            name,
            serial,
          })),
        });
      } catch (err) {
        console.error("Error fetching computer details:", err);
      }
    };

    fetchEditData();
  }, [editPC]);



  const handleOtherPartChange = (index, key, value) => {
    const updated = [...editData.otherParts];
    updated[index][key] = value;
    setEditData({ ...editData, otherParts: updated });
  };

  const removeOtherPart = (index) => {
    const updated = [...editData.otherParts];
    updated.splice(index, 1);
    setEditData({ ...editData, otherParts: updated });
  };

  const addOtherPart = () => {
    if (editData.otherParts.length < 10) {
      setEditData({
        ...editData,
        otherParts: [...editData.otherParts, { name: "", serial: "" }],
      });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      console.log("Edited PC data:", editData);

      // Map to backend expected format
      const payload = {
        pc_name: editData.pcNumber,
        specs: editData.parts,
        other_parts: editData.otherParts
      };

      const response = await api.post(`/update_edit_data/${editPC.id}`, payload);

      console.log('Update response:', response.data);
      toast.success('Computer updated successfully');
      setEditPC(null);

      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('Error updating computer:', err);
      toast.error('Failed to update computer. Please try again.');
    }
  };


  // Normalize computer data to handle backend mismatch
  const normalizedComputers = computers.map(c => ({
    ...c,
    parts: c.parts || c.specs || {},
    pcNumber: c.pcNumber || c.pc_name || "",
    lab: c.lab || c.lab_name || ""
  }));

  const labComputers = normalizedComputers
    .filter((c) => String(c.lab_id) === String(lab.lab_id))
    .sort((a, b) => {
      // Try to sort numerically if possible
      const numA = parseInt(a.pcNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.pcNumber.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.pcNumber.localeCompare(b.pcNumber);
    });


  useEffect(() => {
    if (saveMsg) {
      const timer = setTimeout(() => {
        setSaveMsg("");
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [saveMsg]);

  useEffect(() => {
    const fetchComputerStatuses = async () => {
      try {
        const response = await api.get('/get_computer_statuses');
        const data = response.data;

        const newStatuses = {};
        const newOtherParts = {};

        data.forEach((row) => {
          // Map backend status label to frontend camelCase
          let statusKey = row.status_label;
          if (statusKey === 'not_operational') statusKey = 'notOperational';

          // Distinguish between standard and custom parts
          if (row.type === 'custom') {
            if (!newOtherParts[row.com_id]) newOtherParts[row.com_id] = {};
            newOtherParts[row.com_id][row.part] = statusKey;
          } else {
            if (!newStatuses[row.com_id]) newStatuses[row.com_id] = {};
            newStatuses[row.com_id][row.part] = statusKey;
          }
        });

        setStatuses(newStatuses);
        setotherParts(newOtherParts);
      } catch (err) {
        console.error("Error fetching computer statuses:", err);
      }
    };

    fetchComputerStatuses();
  }, []);

  const partIcons = {
    monitor: FaDesktop,
    systemUnit: FaServer,
    keyboard: FaKeyboard,
    mouse: FaMouse,
    headphone: FaHeadphones,
    hdmi: FaPlug,
    power: FaPlug,
    wifi: FaWifi,
  };

  const getStatusStyle = (compId, part) =>
    statusColors[statuses[compId]?.[part] || "operational"];

  const setStatus = (compId, part, status, isOtherPart = false) => {
    if (isOtherPart) {
      setotherParts((prev) => ({
        ...prev,
        [compId]: {
          ...prev[compId],
          [part]: status,
        },
      }));
    } else {
      setStatuses((prev) => ({
        ...prev,
        [compId]: { ...prev[compId], [part]: status },
      }));
    }
  };


  const getPCColor = (pc) => {
    const partStatuses = Object.keys(pc.parts).map(
      (p) => statuses[pc.id]?.[p] || "operational"
    );
    const worst = partStatuses.reduce(
      (max, curr) =>
        statusColors[curr].priority > statusColors[max].priority ? curr : max,
      "operational"
    );
    return statusColors[worst].color;
  };

  const handleDeleteComputer = async () => {
    try {
      await api.delete(`/delete_computer/${deletePC.id}`);
      toast.success('Computer deleted successfully');
      setDeletePC(null);
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error("Error deleting computer:", err);
      toast.error('Failed to delete computer');
    }
  };


  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button onClick={back} className="btn btn-secondary btn-sm">
          ← Back to Labs
        </button>
        <div>
          <button
            onClick={() => setShowAddComputer(true)}
            className="btn"
            style={{ backgroundColor: "#006633", color: "white", marginRight: 10 }}>
            + Add Computer
          </button>

          <button
            onClick={() => setShowQuickUpdate(true)}
            className="btn btn-warning"
            style={{ color: "#000" }}>
            Quick Update
          </button>
        </div>
      </div>
      {saveMsg && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "35px 40px",
              borderRadius: "18px",
              textAlign: "center",
              boxShadow: "0 8px 25px rgba(0,0,0,0.25)",
              width: "380px",
              animation: "fadeIn 0.4s ease",
            }}
          >

            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                backgroundColor: "#E6F4EA",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto 15px auto",
                animation: "popIn 0.4s ease",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 52 52"
                style={{ width: "38px", height: "38px" }}
              >
                <circle
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                  stroke="#00a651"
                  strokeWidth="2"
                />
                <path
                  fill="none"
                  stroke="#00a651"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 27l7 7 16-16"
                >
                  <animate
                    attributeName="stroke-dasharray"
                    from="0,50"
                    to="50,0"
                    dur="0.6s"
                    fill="freeze"
                  />
                </path>
              </svg>
            </div>

            <h4
              style={{
                color: "#006633",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              {saveMsg}
            </h4>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>


              <button
                className="btn"
                style={{
                  backgroundColor: "#004d26",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: "500",
                }}
                onClick={() => navigate(currentRole === 'technician' ? `/${currentRole}` : `/${currentRole}/reports`)}
              >
                See Report
              </button>

              <button
                className="btn"
                style={{
                  backgroundColor: "#004d26",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: "500",
                }}
                onClick={() => navigate(currentRole === 'technician' ? `/${currentRole}/TechnicianLabs` : `/${currentRole}/labs`)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}


      <h3 style={{ color: "#006633", marginBottom: 15 }}>Computer Lab{lab.name}– {lab.location}</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 20,
        }}
      >
        {labComputers.map((pc) => (
          <div
            key={pc.id}
            onClick={() => setSelectedPC(pc)}
            style={{
              background: getPCColor(pc),
              border: "1px solid #e0e6ed",
              borderRadius: 10,
              padding: "20px 10px",
              textAlign: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              position: "relative",
              overflow: "visible",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.15)";

              const summary = e.currentTarget.querySelector(".part-summary");
              if (summary) {
                const rect = summary.getBoundingClientRect();
                const screenWidth = window.innerWidth;

                if (rect.left < 0) {
                  summary.style.left = `${-rect.left + rect.width / 2}px`;
                } else if (rect.right > screenWidth) {
                  summary.style.left = `calc(50% - ${rect.right - screenWidth}px)`;
                } else {
                  summary.style.left = "50%";
                }

                summary.style.opacity = 1;
                summary.style.transform = "translateX(-50%) translateY(0)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.05)";

              const summary = e.currentTarget.querySelector(".part-summary");
              if (summary) {
                summary.style.opacity = 0;
                summary.style.transform = "translateX(-50%) translateY(-10px)";
              }
            }}
          >
            <FaDesktop size={50} color="#fff" />
            <h6 style={{ marginTop: 10, color: "#fff" }}>PC {pc.pcNumber}</h6>


            <div
              className="part-summary"
              style={{
                position: "absolute",
                top: -10,
                left: "50%",
                transform: "translateX(-50%) translateY(-10px)",
                display: "flex",
                gap: 10,
                background: "rgba(0,0,0,0.85)",
                padding: "8px 12px",
                borderRadius: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                flexWrap: "wrap",
                justifyContent: "center",
                opacity: 0,
                pointerEvents: "none",
                transition: "opacity 0.25s ease, transform 0.25s ease, left 0.25s ease",
                zIndex: 10,
              }}
            >
              {Object.keys(pc.parts).map((part) => {
                const Icon = partIcons[part];
                const status = statuses[pc.id]?.[part] || "operational";
                const color = statusColors[status].color;
                return <Icon key={part} size={18} color={color} title={part} />;
              })}


              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid rgba(0,0,0,0.85)",
                }}
              />
            </div>

            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "flex",
                gap: "10px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <FaEdit
                size={18}
                color="white"
                style={{ cursor: "pointer" }}
                title="Edit"
                onClick={() => {
                  setEditPC(pc);
                  setEditData({
                    pcNumber: pc.pcNumber,
                    serialNumber: pc.serialNumber || "",
                  });
                }}
              />
              <FaTrashAlt
                size={18}
                color="white"
                style={{ cursor: "pointer" }}
                title="Delete"
                onClick={() => setDeletePC(pc)}
              />
            </div>
          </div>
        ))}
      </div>

      {deletePC && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "25px 30px",
              borderRadius: "12px",
              width: "350px",
              textAlign: "center",
              boxShadow: "0 5px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h5 style={{ color: "#006633", marginBottom: "15px" }}>
              Confirm Delete
            </h5>
            <p style={{ color: "#444", fontSize: "15px" }}>
              Are you sure you want to delete{" "}
              <strong>PC {deletePC.pcNumber}</strong>?
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "20px",
              }}
            >
              <button
                className="btn"
                style={{
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  flex: 1,
                  marginRight: "8px",
                }}
                onClick={() => setDeletePC(null)}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  backgroundColor: "#d32f2f",
                  color: "#fff",
                  flex: 1,
                  marginLeft: "8px",
                }}
                onClick={handleDeleteComputer}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editPC && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            overflowY: "auto",
            padding: "15px",
          }}
          onClick={() => setEditPC(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px 25px",
              borderRadius: 16,
              width: "100%",
              maxWidth: "700px",
              boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ color: "#006633", marginBottom: 20, fontWeight: 600 }}>
              Edit Computer – PC {editData.pcNumber || ""}
            </h4>

            <div
              style={{
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
                marginBottom: 15,
                backgroundColor: "#f9fdfd",
              }}
            >
              <label style={{ fontSize: 14, fontWeight: 600, color: "#006633" }}>
                PC Number
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                }}
              >
                <FaDesktop />
                <input
                  type="text"
                  value={editData.pcNumber || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, pcNumber: e.target.value })
                  }
                  style={{
                    flex: 1,
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    padding: "6px 8px",
                    fontSize: 14,
                    backgroundColor: "transparent",
                    color: "#000",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                padding: 12,
                border: "1px solid #ccc",
                borderRadius: 8,
                marginBottom: 15,
                backgroundColor: "#e6f4ea",
              }}
            >
              <h5 style={{ color: "#006633", marginBottom: 10, fontWeight: 600 }}>
                Parts Serial Numbers
              </h5>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 10,
                }}
              >
                {["monitor", "systemUnit", "keyboard", "mouse", "headphone", "hdmi", "power", "wifi"].map(
                  (part) => {
                    const Icon = partIcons[part] || FaPlug;
                    return (
                      <div key={part}>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#006633",
                            marginBottom: 4,
                            display: "block",
                          }}
                        >
                          {part.charAt(0).toUpperCase() + part.slice(1)}
                        </label>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid #ccc",
                            borderRadius: 6,
                            padding: "4px 6px",
                          }}
                        >
                          <Icon />
                          <input
                            type="text"
                            placeholder={`${part} Serial`}
                            value={editData.parts?.[part] || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                parts: { ...editData.parts, [part]: e.target.value },
                              })
                            }
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              fontSize: 14,
                              padding: "4px 2px",
                              backgroundColor: "transparent",
                              color: "#000",
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* --- Other Parts Toggle --- */}
            <div style={{ marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => setShowOtherParts(!showOtherParts)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#ff9800",
                  color: "#fff",
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                {showOtherParts ? "▼ Other Parts" : "► Other Parts"}
              </button>

              {showOtherParts && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    backgroundColor: "#fff3e0",
                  }}
                >
                  {(editData.otherParts || []).map((op, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#006633",
                          }}
                        >
                          Part Name
                        </label>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid #ccc",
                            borderRadius: 6,
                            padding: "4px 6px",
                            marginBottom: 4,
                          }}
                        >
                          <FaPlug />
                          <input
                            type="text"
                            value={op?.name || ""}
                            onChange={(e) =>
                              handleOtherPartChange(idx, "name", e.target.value)
                            }
                            placeholder="Part Name"
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              padding: "4px 2px",
                              backgroundColor: "transparent",
                              color: "#000", // text is black
                            }}
                          />
                        </div>

                        <label
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#006633",
                          }}
                        >
                          Serial Number
                        </label>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            border: "1px solid #ccc",
                            borderRadius: 6,
                            padding: "4px 6px",
                          }}
                        >
                          <FaHashtag />
                          <input
                            type="text"
                            value={op?.serial || ""}
                            onChange={(e) =>
                              handleOtherPartChange(idx, "serial", e.target.value)
                            }
                            placeholder="Serial Number"
                            style={{
                              flex: 1,
                              border: "none",
                              outline: "none",
                              padding: "4px 2px",
                              backgroundColor: "transparent",
                              color: "#000", // text is black
                            }}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOtherPart(idx)}
                        style={{
                          backgroundColor: "#FF4D4D",
                          border: "none",
                          color: "#fff",
                          borderRadius: 6,
                          padding: "6px 10px",
                          cursor: "pointer",
                          marginTop: 18,
                          height: 38,
                        }}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* --- Add Other Part Button (always visible) --- */}
            <div style={{ marginBottom: 15 }}>
              <button
                type="button"
                onClick={() => {
                  setShowOtherParts(true);
                  addOtherPart();
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#00C49A",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Other Part
              </button>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={() => setEditPC(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: "#FFCC00",
                  color: "#006633",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditSubmit}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: "#006633",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}


      {showQuickUpdate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "10px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "85%",
              maxWidth: "900px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 15px 30px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 25px",
                borderBottom: "1px solid #e5e5e5",
                backgroundColor: "#f8f9fa",
              }}
            >
              <h4 style={{ color: "#006633", margin: 0, fontWeight: 700 }}>
                Quick Update PC Status
              </h4>
              <button
                className="btn-close"
                onClick={() => setShowQuickUpdate(false)}
                style={{ fontSize: "20px", color: "#333" }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                padding: "18px 25px",
                overflowY: "auto",
                flex: 1,
                backgroundColor: "#fdfdfd",
              }}
            >
              {/* Step 1: Select Part */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>1. Select Part to Update:</span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 14,
                    marginTop: 10,
                    justifyContent: "center",
                  }}
                >
                  {Object.keys(partIcons).map((part) => {
                    const Icon = partIcons[part];
                    const isActive = selectedPart === part;
                    return (
                      <button
                        key={part}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          padding: "12px 16px",
                          borderRadius: "12px",
                          border: isActive ? "2px solid #006633" : "1px solid #ccc",
                          backgroundColor: isActive ? "#e8f5e9" : "#fafafa",
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                        }}
                        onClick={() => {
                          setSelectedPart(part);
                          setSelectedStatus("");
                          setSelectedPCs([]);
                        }}
                      >
                        <Icon size={30} />
                        <span style={{ fontSize: 14, marginTop: 6, fontWeight: 500 }}>
                          {part}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Select Status */}
              {selectedPart && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    2. Select Status for {selectedPart}:
                  </span>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      marginTop: 10,
                      justifyContent: "center",
                    }}
                  >
                    {Object.keys(statusColors).map((s) => (
                      <button
                        key={s}
                        style={{
                          backgroundColor:
                            selectedStatus === s
                              ? statusColors[s]?.color || "#f4f4f4"
                              : "#ffffff",
                          color:
                            selectedStatus === s
                              ? "#fff"
                              : "#333", // 🔥 Always black text when not selected
                          border: selectedStatus === s ? "2px solid #006633" : "1px solid #ccc",
                          padding: "8px 20px",
                          borderRadius: 30,
                          cursor: "pointer",
                          fontWeight: 600,
                          boxShadow: selectedStatus === s ? "0 3px 8px rgba(0,0,0,0.15)" : "",
                          transition: "all 0.2s",
                        }}
                        onClick={() => setSelectedStatus(s)}
                      >
                        {statusColors[s]?.label || s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Select PCs */}
              {selectedPart && selectedStatus && (
                <div style={{ marginBottom: 15 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    3. Select PCs to Update:
                  </span>

                  {/* Select / Deselect All */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                      marginTop: 10,
                    }}
                  >
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => setSelectedPCs(labComputers.map((pc) => pc.id))}
                    >
                      Select All
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSelectedPCs([])}
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* PC Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: 16,
                      marginTop: 12,
                    }}
                  >
                    {labComputers.map((pc) => {
                      const selected = selectedPCs.includes(pc.id);
                      const currentStatus =
                        pc.parts?.[selectedPart] || "unknown";
                      const statusColor = statusColors[currentStatus]?.color || "#f4f4f4";
                      const selectedStatusColor =
                        statusColors[selectedStatus]?.color || "#c8e6c9";

                      return (
                        <div
                          key={pc.id}
                          onClick={() => {
                            setSelectedPCs((prev) =>
                              prev.includes(pc.id)
                                ? prev.filter((id) => id !== pc.id)
                                : [...prev, pc.id]
                            );
                          }}
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            border: selected ? "2px solid #006633" : "1px solid #ddd",
                            cursor: "pointer",
                            background:
                              selected || currentStatus === "unknown"
                                ? selectedStatusColor
                                : statusColor,
                            textAlign: "center",
                            position: "relative",
                            transition: "all 0.2s ease",
                            boxShadow: selected ? "0 4px 10px rgba(0,0,0,0.15)" : "",
                          }}
                        >
                          <FaDesktop size={36} />
                          <div
                            style={{
                              fontSize: 14,
                              marginTop: 8,
                              fontWeight: 600,
                              color: "#333",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={pc.pcNumber}
                          >
                            {pc.pcNumber}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "12px 25px",
                borderTop: "1px solid #e5e5e5",
                backgroundColor: "#f8f9fa",
              }}
            >
              <button
                className="btn btn-outline-secondary"
                onClick={() => setShowQuickUpdate(false)}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{ backgroundColor: "#006633", color: "#fff", padding: "6px 16px" }}
                onClick={() => {
                  const updated = {};
                  selectedPCs.forEach((pcId) => {
                    updated[pcId] = {
                      [selectedPart]: {
                        status: selectedStatus,
                        type: "standard" // or "other" if selectedPart is dynamic
                      }
                    };
                  });

                  (async () => {
                    try {
                      const response = await api.post('/update_computer_status_bulk', {
                        statuses: updated
                      });
                      console.log("Saved all:", response.data);
                      toast.success('Selected PCs updated successfully');
                      setShowQuickUpdate(false);
                      setSaveMsg("Selected PCs updated!");

                      // Update local state
                      setStatuses(prev => {
                        const newStatuses = { ...prev };
                        selectedPCs.forEach(pcId => {
                          if (!newStatuses[pcId]) newStatuses[pcId] = {};
                          newStatuses[pcId][selectedPart] = selectedStatus;
                        });
                        return newStatuses;
                      });

                      setTimeout(() => setSaveMsg(""), 4000);
                    } catch (err) {
                      console.error("Error saving bulk statuses:", err);
                      toast.error('Failed to update computer statuses');
                    }
                  })();
                }}
              >
                Save All
              </button>
            </div>
          </div>
        </div>
      )}





      {selectedPC && (
        <div className="modal-backdrop">
          <div
            className="modal-card"
            style={{
              width: "90%",
              maxWidth: "900px",
              margin: "0 auto",
            }}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{ backgroundColor: "#006633", color: "white", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>PC {selectedPC.pcNumber} – Update Status</span>
              <button
                onClick={() => setSelectedPC(null)}
                className="btn-close text-white"
              >
                <FaTimes />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ padding: 20 }}>
              {/* Main parts grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                {Object.keys(selectedPC.parts).map((part) => {
                  const Icon = partIcons[part];
                  const style = getStatusStyle(selectedPC.id);
                  const value = selectedPC.parts[part];
                  const partLabel =
                    value === 1 ? "Present" : value === 0 ? "Missing" : String(value);

                  return (
                    <div
                      key={part}
                      style={{
                        textAlign: "center",
                        padding: 12,
                        borderRadius: 10,
                        background: "#f8f9fa",
                      }}
                    >
                      <Icon size={50} color={style.color} />
                      <div style={{ textTransform: "capitalize", marginTop: 6 }}>
                        {part}
                      </div>
                      <div style={{ fontSize: 12, color: "#495057", marginTop: 4 }}>
                        {partLabel}
                      </div>
                      <StatusButtons
                        part={part}
                        compId={selectedPC.id}
                        status={statuses[selectedPC.id]?.[part] || "operational"}
                        setStatus={setStatus}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Status Legend */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 20,
                  marginTop: 25,
                  flexWrap: "wrap",
                  background: "#f8f9fa",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {Object.keys(statusColors).map((s) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        backgroundColor: statusColors[s].color,
                        border: "1px solid #ccc",
                      }}
                    />
                    <span style={{ fontSize: 14, color: "#495057" }}>
                      {statusColors[s].label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Toggle Other Parts Button */}
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button
                  onClick={() => setShowOtherParts(prev => !prev)}
                  style={{
                    backgroundColor: "#ff9800",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 16px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {showOtherParts ? "Hide Other Parts" : "Update Other Parts"}
                </button>
              </div>

              {/* Other Parts Section */}
              {showOtherParts && (
                <div
                  style={{
                    backgroundColor: "#fff3e0",
                    border: "1px solid #ffb74d",
                    borderRadius: 10,
                    padding: 15,
                    marginTop: 12,
                    minHeight: 80,
                  }}
                >
                  {otherParts[selectedPC.id] && Object.keys(otherParts[selectedPC.id]).length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 12,
                      }}
                    >
                      {Object.entries(otherParts[selectedPC.id] || {}).map(([partName, status]) => (

                        <div
                          key={partName}
                          style={{
                            textAlign: "center",
                            padding: 10,
                            borderRadius: 10,
                            background: "#fff8f0",
                            minHeight: 100,
                            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                          }}
                        >

                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: 8,
                              fontSize: 14,
                              color: "#333",
                            }}
                          >
                            {partName}
                          </div>
                          <StatusButtons
                            part={partName}
                            compId={selectedPC.id}
                            status={status || "operational"}
                            setStatus={(id, part, s) => setStatus(id, part, s, true)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        color: "#ff5722",
                        fontWeight: 600,
                        fontSize: 14,
                        padding: 15,
                      }}
                    >
                      No other parts
                    </div>
                  )}
                </div>
              )}

            </div>


            <div
              className="modal-footer"
              style={{ display: "flex", justifyContent: "flex-end", padding: 12, gap: 12 }}
            >
              <button
                onClick={() => setSelectedPC(null)}
                style={{
                  backgroundColor: "#FFCC00",
                  color: "#006633",
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const compStatuses = statuses[selectedPC.id] || {};
                  const compOtherParts = otherParts[selectedPC.id] || {};
                  const compIdToSend = selectedPC.id; // Use the standard ID

                  // Construct bulk payload
                  const bulkPayload = {
                    [compIdToSend]: {}
                  };

                  // Add standard parts
                  Object.entries(compStatuses).forEach(([part, status]) => {
                    let statusToSend = status;
                    if (status === 'notOperational') statusToSend = 'not_operational';

                    bulkPayload[compIdToSend][part] = {
                      status: statusToSend,
                      type: "standard"
                    };
                  });

                  // Add other parts
                  Object.entries(compOtherParts).forEach(([part, status]) => {
                    let statusToSend = status;
                    if (status === 'notOperational') statusToSend = 'not_operational';

                    bulkPayload[compIdToSend][part] = {
                      status: statusToSend,
                      type: "custom"
                    };
                  });

                  (async () => {
                    try {
                      const response = await api.post('/update_computer_status_bulk', {
                        statuses: bulkPayload
                      });
                      console.log("Saved:", response.data);
                      toast.success('Computer status updated successfully');
                      setSelectedPC(null);
                      setSaveMsg("Status updated successfully!");
                    } catch (err) {
                      console.error("Error saving statuses:", err);
                      toast.error('Failed to update computer status');
                    }
                  })();
                }}
                style={{
                  backgroundColor: "#006633",
                  color: "white",
                  fontWeight: "600",
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}









      {showAddComputer && (
        <AddComputerModal
          onClose={() => setShowAddComputer(false)}
          lab={lab}
        />
      )}

    </div>
  );
}
