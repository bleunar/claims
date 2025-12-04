import React, { useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";

function ITSDAddUserModal({ show, onClose }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "technician", // Hardcoded to technician
        year: "",
        password: "",
    });

    const [imagePreview, setImagePreview] = useState("/img/default.png");
    const [selectedFile, setSelectedFile] = useState(null);

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = e => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const adduserhandleSubmit = async e => {
        e.preventDefault();

        try {
            let imageUrl = "";

            // Note: File upload logic for profile image is not fully implemented in the original modal either
            // (it sends empty string for profile). 
            // If needed, we should implement file upload here similar to update profile.
            // For now, keeping consistent with original implementation.

            const response = await api.post('/register_user', {
                ...formData,
                profile: imageUrl
            });

            if (response.data.success) {
                toast.success("Technician registered successfully!");
                onClose();
                setTimeout(() => window.location.reload(), 500);
            } else {
                toast.error(response.data.message || "Registration failed!");
            }
        } catch (error) {
            console.error('Error registering user:', error);
            toast.error('Failed to register user');
        }
    };

    return (
        <>
            <div className={`modal fade ${show ? "show d-block visible" : ""}`} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content rounded-4 shadow">
                        <div className="modal-header bg-success text-white position-relative">
                            <h5 className="modal-title">Register New Technician</h5>
                            <button
                                type="button"
                                className="btn-close"
                                aria-label="Close"
                                onClick={onClose}
                                style={{
                                    position: "absolute",
                                    top: "15px",
                                    right: "15px",
                                    filter: "invert(0)", // makes 'X' icon black
                                    opacity: 1,
                                }}
                            ></button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={adduserhandleSubmit}>
                                <div className="row g-4">
                                    <div className="col-md-4 text-center">
                                        <img
                                            src={imagePreview}
                                            alt="Profile Preview"
                                            className="img-thumbnail rounded-circle mb-3"
                                            style={{ width: "150px", height: "150px", objectFit: "cover" }}
                                        />
                                        <input type="file" className="form-control" onChange={handleFileChange} />
                                    </div>

                                    <div className="col-md-8">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <FormField
                                                    label="Name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    type="text"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <FormField
                                                    label="Email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    type="email"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <FormField
                                                    label="Password"
                                                    name="password"
                                                    value={formData.password}
                                                    onChange={handleChange}
                                                    type="password"
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold text-success">Role</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value="Technician"
                                                    disabled
                                                    style={{ borderRadius: "0.5rem", padding: "0.6rem", backgroundColor: "#e9ecef" }}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <FormField
                                                    label="Year"
                                                    name="year"
                                                    value={formData.year}
                                                    onChange={handleChange}
                                                    type="text"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-success w-100 mt-4">
                                    Register Technician
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {show && <div className="modal-backdrop fade show custom-backdrop" onClick={onClose}></div>}
        </>
    );
}

const FormField = ({ label, name, value, onChange, type }) => (
    <div>
        <label className="form-label fw-bold text-success">{label}</label>
        <input
            type={type}
            className="form-control"
            name={name}
            value={value}
            onChange={onChange}
            required
            style={{ borderRadius: "0.5rem", padding: "0.6rem" }}
        />
    </div>
);

export default ITSDAddUserModal;
