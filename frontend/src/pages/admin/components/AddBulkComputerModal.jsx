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
    FaListOl,
    FaSortNumericDown,
} from "react-icons/fa";
import api from "../../../utils/api";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";

export default function AddBulkComputerModal({ lab, addComputers, onClose }) {
    if (!lab) return null;

    const [pcPrefix, setPcPrefix] = useState("PC ");
    const [startNumber, setStartNumber] = useState(1);
    const [count, setCount] = useState(20);
    const [loading, setLoading] = useState(false);

    const [parts, setParts] = useState({
        monitor: { name: "", serial: "" },
        systemUnit: { name: "", serial: "" },
        keyboard: { name: "", serial: "" },
        mouse: { name: "", serial: "" },
        headphone: { name: "", serial: "" },
        hdmi: { name: "", serial: "" },
        power: { name: "", serial: "" },
        wifi: { name: "", serial: "" },
    });
    const [otherParts, setOtherParts] = useState([]);
    const [showOtherParts, setShowOtherParts] = useState(false);

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

    const handleChange = (part, field, value) => {
        setParts({
            ...parts,
            [part]: { ...parts[part], [field]: value },
        });
    };
    const handleOtherPartChange = (index, field, value) => {
        const updated = [...otherParts];
        updated[index][field] = value;
        setOtherParts(updated);
    };
    const addOtherPart = () => setOtherParts([...otherParts, { name: "", serial: "" }]);
    const removeOtherPart = (index) => setOtherParts(otherParts.filter((_, i) => i !== index));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const computers = [];
        for (let i = 0; i < count; i++) {
            const currentNum = parseInt(startNumber) + i;
            const pcName = `${pcPrefix}${currentNum}`;

            computers.push({
                pc_name: pcName,
                lab_name: lab.name,
                lab_id: lab.lab_id,
                specs: JSON.stringify(parts),
                other_parts: JSON.stringify(otherParts)
            });
        }

        try {
            const response = await api.post('/computer/bulk', {
                data: computers
            });
            addComputers?.(response.data);
            toast.success(`${computers.length} computers added successfully`);
            onClose();
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            console.error('Error adding computers:', err);
            toast.error('Failed to add computers');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-card shadow-lg rounded-3" style={{ maxWidth: "900px", width: "90%" }}>
                <div className="modal-header bg-success text-white d-flex justify-content-between align-items-center p-3">
                    <h5 className="mb-0">Add Bulk Computers – Lab {lab.name}</h5>
                    <button onClick={onClose} className="btn-close text-white"><FaTimes /></button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        {/* Bulk Settings */}
                        <div className="p-3 mb-3 rounded-2" style={{ backgroundColor: "#e8f5e9" }}>
                            <h6 className="fw-bold text-success mb-3">Bulk Configuration</h6>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <label className="form-label fw-bold">PC Name Prefix</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text"><FaDesktop /></span>
                                        <input type="text" className="form-control" value={pcPrefix} onChange={(e) => setPcPrefix(e.target.value)} required />
                                    </div>
                                    <div className="form-text">e.g., "PC " results in "PC 1", "PC 2"...</div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-bold">Start Number</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text">#</span>
                                        <input type="number" className="form-control" value={startNumber} onChange={(e) => setStartNumber(e.target.value)} required min="1" />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label fw-bold">Count</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text">#</span>
                                        <input type="number" className="form-control" value={count} onChange={(e) => setCount(e.target.value)} required min="1" max="100" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Parts Section */}
                        <div className="p-3 mb-3 rounded-2" style={{ backgroundColor: "#e8f5e9" }}>
                            <h6 className="fw-bold text-success mb-3">Component Models (Applied to All)</h6>
                            <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3">
                                {Object.keys(parts).map((p) => (
                                    <div key={p} className="col mb-3">
                                        <label className="form-label text-start text-capitalize w-100">
                                            <span className="fw-bold me-1">{partIcons[p]}</span> {p}
                                        </label>
                                        <div className="d-flex gap-2">
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Name/Model"
                                                value={parts[p].name}
                                                onChange={(e) => handleChange(p, "name", e.target.value)}
                                                required
                                            />
                                            {/* Serial number hidden/disabled for bulk add as they should be unique per unit */}
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Serial (Leave Empty)"
                                                value={parts[p].serial}
                                                onChange={(e) => handleChange(p, "serial", e.target.value)}
                                                disabled
                                                title="Serials must be unique per unit. Update them individually later."
                                                style={{ backgroundColor: "#e9ecef" }}
                                                hidden
                                            />
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
                                <h6 className="fw-bold text-warning mb-3">Other Parts (Applied to All)</h6>
                                {otherParts.map((part, i) => (
                                    <div key={i} className="row g-2 mb-2 align-items-end">
                                        <div className="col-10">
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text"><FaPlug /></span>
                                                <input type="text" className="form-control" placeholder="Part Name" value={part.name} onChange={(e) => handleOtherPartChange(i, "name", e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="col-2 d-none">
                                            <div className="input-group input-group-sm">
                                                <span className="input-group-text"><FaHashtag /></span>
                                                <input type="text" className="form-control" placeholder="Serial (Leave Empty)" value={part.serial} onChange={(e) => handleOtherPartChange(i, "serial", e.target.value)} disabled style={{ backgroundColor: "#e9ecef" }} />
                                            </div>
                                        </div>
                                        <div className="col-md-2">
                                            <button type="button" className="btn btn-outline-danger btn-sm w-100" onClick={() => removeOtherPart(i)}><FaTrashAlt /></button>
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
                            <button type="submit" className="btn btn-success btn-sm" disabled={loading}>
                                {loading ? "Adding..." : "Add Computers"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
