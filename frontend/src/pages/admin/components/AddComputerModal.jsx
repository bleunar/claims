import React, { useState } from "react";
import {
  FaDesktop,
  FaMouse,
  FaKeyboard,
  FaHeadphones,
  FaServer,
  FaPlug,
  FaWifi,
  FaTimes,
  FaHashtag,
  FaTrashAlt,
  FaUpload,
} from "react-icons/fa";
import ExcelJS from "exceljs";
import api from "../../../utils/api";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";

export default function AddComputerModal({ lab, addComputer, addComputers, onClose }) {
  if (!lab) return null;

  const [pcNumber, setPcNumber] = useState("");
  const [parts, setParts] = useState({
    monitor: "",
    systemUnit: "",
    keyboard: "",
    mouse: "",
    headphone: "",
    hdmi: "",
    power: "",
    wifi: "",
  });
  const [otherParts, setOtherParts] = useState([]);
  const [showOtherParts, setShowOtherParts] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const partIcons = {
    monitor: <FaDesktop className="text-success" />,
    systemUnit: <FaServer className="text-success" />,
    keyboard: <FaKeyboard className="text-success" />,
    mouse: <FaMouse className="text-success" />,
    headphone: <FaHeadphones className="text-success" />,
    hdmi: <FaPlug className="text-success" />,
    power: <FaPlug className="text-success" />,
    wifi: <FaWifi className="text-success" />,
  };

  const handleChange = (e) => setParts({ ...parts, [e.target.name]: e.target.value });
  const handleOtherPartChange = (index, field, value) => {
    const updated = [...otherParts];
    updated[index][field] = value;
    setOtherParts(updated);
  };
  const addOtherPart = () => setOtherParts([...otherParts, { name: "", serial: "" }]);
  const removeOtherPart = (index) => setOtherParts(otherParts.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lab.computers?.some((c) => c.name.toLowerCase() === pcNumber.toLowerCase())) {
      toast.warning(`Computer "${pcNumber}" already exists.`);
      return;
    }
    try {
      const response = await api.post('/computer', {
        data: {
          lab_id: lab.lab_id,
          pc_name: pcNumber,
          lab_name: lab.name,
          specs: JSON.stringify(parts),
          other_parts: JSON.stringify(otherParts),
        },
      });
      addComputer?.(response.data);
      toast.success('Computer added successfully');
      onClose();
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('Error adding computer:', err);
      toast.error('Failed to add computer');
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = evt.target.result;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      const worksheet = workbook.worksheets[0];

      const rows = [];
      const headers = [];

      // Get headers from first row
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value || '';
      });

      // Get data rows starting from second row
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            rowData[header] = cell.value || '';
          });
          rows.push(rowData);
        }
      });

      const computers = rows.map((r) => ({
        pc_name: r.pc_name || r.pcNumber || r.name || "",
        lab_name: lab.name,
        lab_id: lab.lab_id,
        specs: JSON.stringify({
          monitor: r.monitor || "",
          systemUnit: r.systemUnit || "",
          keyboard: r.keyboard || "",
          mouse: r.mouse || "",
          headphone: r.headphone || "",
          hdmi: r.hdmi || "",
          power: r.power || "",
          wifi: r.wifi || "",
        }),
      }));
      setUploading(true);
      try {
        const response = await api.post('/computer/bulk', {
          data: computers
        });
        addComputers?.(response.data);
        toast.success(`${computers.length} computers uploaded successfully`);
        setTimeout(() => {
          window.location.reload();
          onClose();
        }, 500);
      } catch (err) {
        console.error('Error uploading computers:', err);
        toast.error('Failed to upload computers');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card shadow-lg rounded-3" style={{ maxWidth: "900px", width: "90%" }}>
        <div className="modal-header bg-success text-white d-flex justify-content-between align-items-center p-3">
          <h5 className="mb-0">Add Computer – Lab {lab.name}</h5>
          <div className="d-flex gap-2">
            <button type="button" className={`btn btn-sm ${!bulkMode ? "btn-light" : "btn-outline-light"}`} onClick={() => setBulkMode(false)}>Manual</button>
            <button type="button" className={`btn btn-sm ${bulkMode ? "btn-light" : "btn-outline-light"}`} onClick={() => setBulkMode(true)}>Bulk Upload</button>
            <button onClick={onClose} className="btn-close text-white ms-3"><FaTimes /></button>
          </div>
        </div>

        <div className="modal-body p-4">
          {bulkMode ? (
            <div
              className="p-4 rounded-3"
              style={{ backgroundColor: "#f0f8ff", border: "2px dashed #006633" }}
            >
              <div className="d-flex align-items-center mb-3">
                <FaUpload size={24} className="text-success me-2" />
                <h5 className="mb-0 text-success">Bulk Upload Computers</h5>
              </div>

              <p className="text-muted mb-3">
                Upload a CSV or Excel file with computer details. Required columns: <br />
                <strong>pc_name, monitor, systemUnit, keyboard, mouse, headphone, hdmi, power, wifi</strong>
              </p>

              <div className="mb-3">
                <input
                  type="file"
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="form-control"
                  disabled={uploading}
                />
              </div>

              <button
                type="button"
                className="btn btn-success w-100 mb-2 d-flex align-items-center justify-content-center"
                disabled={!selectedFile || uploading}
                onClick={handleBulkUpload}
              >
                {uploading ? (
                  "Uploading…"
                ) : (
                  <>
                    <FaUpload className="me-2" /> Upload Now
                  </>
                )}
              </button>


            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* PC Number */}
              <div className="mb-3">
                <label className="form-label fw-bold">PC Number</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><FaDesktop /></span>
                  <input type="text" className="form-control" value={pcNumber} onChange={(e) => setPcNumber(e.target.value)} required />
                </div>
              </div>

              {/* Parts Section */}
              <div className="p-3 mb-3 rounded-2" style={{ backgroundColor: "#e8f5e9" }}>
                <h6 className="fw-bold text-success mb-3">Parts Serial Numbers</h6>
                <div className="row g-3">
                  {Object.keys(parts).map((p) => (
                    <div key={p} className="col-md-3">
                      <label className="form-label small text-capitalize">{p}</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text">{partIcons[p]}</span>
                        <input type="text" name={p} className="form-control" value={parts[p]} onChange={handleChange} required />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Parts Toggle */}
              <div className="mb-2">
                {!showOtherParts && (
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={() => { setShowOtherParts(true); addOtherPart(); }}>
                    + Add Other Parts
                  </button>
                )}
              </div>

              {/* Other Parts Section */}
              {showOtherParts && (
                <div className="p-3 mb-3 rounded-2" style={{ backgroundColor: "#fff3e0", border: "1px solid #ffb74d" }}>
                  <h6 className="fw-bold text-warning mb-3">Other Parts</h6>
                  {otherParts.map((part, i) => (
                    <div key={i} className="row g-2 mb-2 align-items-end">
                      <div className="col-md-5">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><FaPlug /></span>
                          <input type="text" className="form-control" placeholder="Part Name" value={part.name} onChange={(e) => handleOtherPartChange(i, "name", e.target.value)} />
                        </div>
                      </div>
                      <div className="col-md-5">
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><FaHashtag /></span>
                          <input type="text" className="form-control" placeholder="Serial Number" value={part.serial} onChange={(e) => handleOtherPartChange(i, "serial", e.target.value)} />
                        </div>
                      </div>
                      <div className="col-md-2">
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeOtherPart(i)}><FaTrashAlt /></button>
                      </div>
                    </div>
                  ))}
                  {otherParts.length < 5 && (
                    <div className="d-flex justify-content-end">
                      <button type="button" className="btn btn-outline-success btn-sm" onClick={addOtherPart}>
                        + Add Another Part
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-footer d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-success btn-sm">Add Computer</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
