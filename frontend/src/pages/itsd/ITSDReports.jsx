import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { toast } from "react-toastify";
import "../admin/components/labs.css";

export default function ITSDReports() {
    const [adminReports, setAdminReports] = useState([]);
    const [filterText, setFilterText] = useState("");

    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    // --- Check session ---
    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/");
        }
    }, [isAuthenticated, navigate]);

    // --- Fetch reports ---
    const fetchReports = async () => {
        try {
            const response = await api.get('/get_admin_computer_reports');
            // Map backend keys to frontend structure
            const mappedData = response.data.map(r => ({
                ...r,
                item: r.pc_name,
                lab: r.lab_name,
                notes: r.issue_description,
                date: r.created_at,
                // Map status to frontend capitalized format if needed for colors
                status: r.status === 'not_operational' ? 'Notoperational' :
                    r.status === 'damaged' ? 'Damaged' :
                        r.status === 'missing' ? 'Missing' :
                            r.status === 'operational' ? 'Operational' :
                                r.status.charAt(0).toUpperCase() + r.status.slice(1)
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

    // --- Table columns ---
    const columns = [
        { name: "PC Number", selector: (row) => row.item, sortable: true },
        { name: "Lab", selector: (row) => row.lab, sortable: true },
        {
            name: "Status",
            selector: (row) => row.status,
            sortable: true,
            cell: (row) => (
                <span
                    style={{
                        backgroundColor:
                            row.status === "Operational"
                                ? "#006633"
                                : row.status === "Warning"
                                    ? "#FFCC00"
                                    : row.status === "Notoperational"
                                        ? "#FFCC00"
                                        : row.status === "Damaged"
                                            ? "#dc3545"
                                            : row.status === "Missing"
                                                ? "#6c757d"
                                                : "#f8f9fa",
                        color:
                            row.status === "Notoperational" || row.status === "Warning"
                                ? "#000"
                                : "#fff",
                        padding: "3px 7px",
                        borderRadius: "5px",
                    }}
                >
                    {row.status}
                </span>
            ),
        },
        { name: "Date", selector: (row) => new Date(row.date).toLocaleString(), sortable: true },
        { name: "Notes", selector: (row) => row.notes || "—" },
    ];

    const customStyles = { headRow: { style: { backgroundColor: "#006633", color: "#fff" } } };

    return (
        <div className="container py-5">
            <h1 className="text-center mb-4" style={{ color: "#006633" }}>
                ITSD Reports Dashboard
            </h1>

            <div className="d-flex justify-content-end mb-3">
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
        </div>
    );
}
