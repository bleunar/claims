import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api, { uploadFile } from "../../utils/api";
import { toast } from "react-toastify";
import "bootstrap/dist/css/bootstrap.min.css";
import AddUserModal from "./AddUserModal";

function DeanEdit() {
  const { user: authUser, updateUserProfile } = useAuth();
  const [user, setUser] = useState(authUser);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [imagePreview, setImagePreview] = useState("/img/default.png");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await api.get('/get_user');
        if (!response.data.error) {
          setUser(response.data);
          setFormData(prev => ({
            ...prev,
            name: response.data.name || "",
            email: response.data.email || "",
          }));
          setImagePreview(response.data.image || "/img/default.png");
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

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

  const handleSubmit = async e => {
    e.preventDefault();
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast.error("New password and confirm password do not match!");
      return;
    }

    try {
      setSubmitting(true);
      let imageUrl = user.image;

      if (selectedFile) {
        const imgData = new FormData();
        imgData.append("image", selectedFile);
        
        const imgResponse = await uploadFile('/upload_profile_image', imgData);
        if (imgResponse.data.success) {
          imageUrl = imgResponse.data.image_url;
        }
      }

      const response = await api.post('/update_profile', {
        ...formData,
        image: imageUrl
      });

      if (response.data.success) {
        toast.success("Profile updated successfully!");
        updateUserProfile(response.data.user || formData);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error(response.data.message || "Update failed!");
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="d-flex justify-content-end mb-3">
      </div>
      <AddUserModal show={showModal} onClose={() => setShowModal(false)} />
      <div className="row justify-content-center g-4">
        {/* Image Card */}
        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4 text-center h-100">
            <img
              src={imagePreview}
              alt="Profile"
              className="rounded-circle mb-3 mx-auto"
              style={{
                width: "180px",
                height: "180px",
                objectFit: "cover",
                cursor: "pointer",
                border: "3px solid #36A420",
              }}
              onClick={() => document.getElementById("profilePicInput").click()}
            />
            <input
              id="profilePicInput"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <p className="text-muted small">Click image to update</p>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4 h-100">
            <h4 className="text-center text-success mb-4">Profile Info</h4>
            <FormField label="Name" name="name" value={formData.name} onChange={handleChange} type="text" />
            <FormField label="Email" name="email" value={formData.email} onChange={handleChange} type="email" />
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card shadow-sm p-4 h-100">
            <h4 className="text-center text-success mb-4">Change Password</h4>
            <FormField type="password" label="Current Password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} />
            <FormField type="password" label="New Password" name="newPassword" value={formData.newPassword} onChange={handleChange} />
            <FormField type="password" label="Confirm New Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
            <button className="btn btn-success w-100 mt-3" onClick={handleSubmit}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const FormField = ({ label, name, value, onChange, type = "text" }) => (
  <div className="mb-3">
    <label className="form-label text-success fw-bold">{label}</label>
    <input
      type={type}
      className="form-control"
      name={name}
      value={value}
      onChange={onChange}
      style={{ borderRadius: "0.5rem", padding: "0.6rem" }}
    />
  </div>
);


export default DeanEdit;
