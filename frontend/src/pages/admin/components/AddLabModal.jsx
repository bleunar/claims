import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";
import api from "../../../utils/api";
import { toast } from "react-toastify";
import "./labs.css";

export default function AddLabModal({ addLab, onClose }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/add_laboratory', {
        data: { lab_name: name, location }
      });

      if (response.data) {
        addLab(response.data);
        toast.success('Laboratory added successfully');
        onClose();
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error("Error adding lab:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to add laboratory';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h5>Add Laboratory</h5>
          <button className="btn-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Laboratory Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="CL 0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              className="form-control"
              placeholder="Computer Laboratory 0"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-add-lab">
              Add Lab
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
