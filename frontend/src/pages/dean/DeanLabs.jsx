import { useEffect, useState,useRef} from "react";
import {
  FaDesktop,
  FaMouse,
  FaKeyboard,
  FaHeadphones,
  FaServer,
  FaPlug,
  FaWifi,
  FaTimes,
  
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import ExcelJS from "exceljs";



const statusColors = {
  operational: { color: "#006633", label: "Operational", priority: 0 },
  notOperational: { color: "#FFCC00", label: "Not Operational", priority: 1 },
  damaged: { color: "#dc3545", label: "Damaged", priority: 2 },
  missing: { color: "#6c757d", label: "Missing", priority: 3 },
};

function StatusButtons({ part, compId, status, setStatus }) {
  const statuses = ["operational", "notOperational", "damaged", "missing"];
  const [hovered, setHovered] = useState(null);

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
            backgroundColor: status === s ? statusColors[s].color : "transparent",
            cursor: "pointer",
            boxShadow: hovered === s ? `0 0 6px ${statusColors[s].color}` : "none",
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

function LabGrid({ labs, selectLab }) {
  const [pcCount, setPcCount] = useState({});

  // Fetch PC counts per lab
  useEffect(() => {
    if (!labs || labs.length === 0) return;

    const fetchPcCount = async () => {
      try {
        const response = await api.get('/labs-pc-count');
        const counts = {};
        response.data.forEach((item) => {
          counts[item.lab_name] = item.pc_count;
        });
        setPcCount(counts);
      } catch (error) {
        console.error("Error fetching lab counts:", error);
      }
    };

    fetchPcCount();
  }, [labs]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(180px, 1fr))", // 5 columns
        gap: "20px",
        padding: "20px",
        justifyItems: "center",
      }}
    >
      {labs
        .slice()
        .sort((a, b) => Number(a.name) - Number(b.name))
        .map((lab) => (
          <div
            key={lab.id}
            onClick={() => selectLab(lab)}
            style={{
              position: "relative",
              background: "#fff",
              borderRadius: 20,
              padding: "20px 15px",
              cursor: "pointer",
              textAlign: "center",
              width: "100%",
              minHeight: 150,
              boxShadow: "0 4px 18px rgba(0,0,0,0.12)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,0,0,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.12)";
            }}
          >
            {/* PC Count */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                backgroundColor: "#006633",
                color: "#FFCC00",
                padding: "6px 10px",
                borderRadius: "50%",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              {pcCount[lab.name] ?? 0}
            </div>

            {/* Desktop Icon */}
            <div
              style={{
                backgroundColor: "#00663320",
                borderRadius: "50%",
                width: 50,
                height: 50,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto 12px auto",
              }}
            >
              <FaDesktop size={24} color="#006633" />
            </div>

            {/* Lab Name */}
            <h5
              style={{
                color: "#006633",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Computer Lab {lab.name}
            </h5>

          
            <span
              style={{
                backgroundColor: "#FFCC00",
                color: "#006633",
                padding: "4px 10px",
                borderRadius: 14,
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              {lab.location}
            </span>
          </div>
        ))}
    </div>
  );
}










function LabDetail({ lab, computers, back, addComputer }) {
  const [statuses, setStatuses] = useState({});
  const [selectedPC, setSelectedPC] = useState(null);
  const [showAddComputer, setShowAddComputer] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [showOtherParts, setShowOtherParts] = useState(true); 
  const [otherParts, setotherParts] = useState({});

  const labComputers = computers
    .filter((c) => c.lab === lab.name)
    .sort((a, b) => a.pcNumber - b.pcNumber);

  useEffect(() => {
    if (saveMsg) {
      const timer = setTimeout(() => {
        setSaveMsg("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveMsg]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await api.get('/get_computer_statuses');
        const newStatuses = {};
        response.data.forEach((row) => {
          newStatuses[row.com_id] = {
            hdmi: row.hdmi,
            headphone: row.headphone,
            keyboard: row.keyboard,
            monitor: row.monitor,
            mouse: row.mouse,
            power: row.power,
            systemUnit: row.systemUnit,
            wifi: row.wifi,
          };
        });
        setStatuses(newStatuses);
      } catch (error) {
        console.error("Error fetching statuses:", error);
        toast.error('Failed to load computer statuses');
      }
    };

    fetchStatuses();
  }, []);

  useEffect(() => {
    const fetchOtherParts = async () => {
      try {
        const response = await api.get('/get_other_part_status');
        const partsByPC = {};
        response.data.forEach((row) => {
          if (!partsByPC[row.com_id]) {
            partsByPC[row.com_id] = {};
          }
          partsByPC[row.com_id][row.part] = row.status;
        });
        setotherParts(partsByPC);
      } catch (error) {
        console.error("Error fetching other parts:", error);
        toast.error('Failed to load accessory statuses');
      }
    };
  
    fetchOtherParts();
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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button onClick={back} className="btn btn-secondary btn-sm">
          ← Back to Labs
        </button>
       
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
                  backgroundColor: "#006633",
                  color: "#fff",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontWeight: "500",
                }}
                onClick={() => setSaveMsg("")}
              >
                OK
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
                onClick={() => (window.location.href = "technician/TechnicianReports")}
              >
                See Report
              </button>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ color: "#006633", marginBottom: 15 }}>
        Computer Lab {lab.name} – {lab.location}
      </h3>

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
                transition: "opacity 0.25s ease, transform 0.25s ease",
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
          </div>
        ))}
      </div>

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

      {/* Footer */}
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
            const compStatuses = statuses[selectedPC.id];
            const compOtherParts = otherParts[selectedPC.id] || {};
            const compIdToSend =
              selectedPC.real_id || selectedPC.random_id || selectedPC.id;

            (async () => {
              try {
                const response = await api.post('/update_computer_status', {
                  compId: compIdToSend,
                  statuses: compStatuses,
                  compOtherParts: compOtherParts
                });
                console.log("Saved:", response.data);
                setSelectedPC(null);
                setSaveMsg("Status updated successfully!");
                toast.success('Computer status updated successfully');
              } catch (error) {
                console.error("Error saving statuses:", error);
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
          lab={lab}
          addComputer={addComputer}
          onClose={() => setShowAddComputer(false)}
        />
      )}
    </div>
  );
}




import { useNavigate } from "react-router-dom";
export default function App() {
  const [selectedLab, setSelectedLab] = useState(null);
  const [labs, setLabs] = useState([]);
  const [computers, setComputers] = useState([]);
  const [showAddLab, setShowAddLab] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

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
        console.error("Error fetching data:", error);
        toast.error('Failed to load laboratories and computers');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const addLab = (lab) => setLabs((prev) => [...prev, lab]);
  const addComputer = (comp) => setComputers((prev) => [...prev, comp]);

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
      {showAddLab && (
        <AddLabModal addLab={addLab} onClose={() => setShowAddLab(false)} />
      )}
    </div>
  );
}
