import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/UpdateProfile.css";

function UpdateProfile() {
  const { adminInfo, setAdminInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [UpdateAdminID, setUpdateAdminID] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/auth/admin/getprofile",
          { withCredentials: true }
        );
        console.log(response.data.user);
        
        setAdminInfo(response.data.user);
        setUpdateAdminID(response.data.user?.adminID || "");
      } catch (error) {
        console.error("Error fetching admin profile:", error);
      }
    };
    fetchProfile();
  }, [setAdminInfo]); 

  const UpdateAdminProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const isChangingPassword = oldPassword || newPassword || confirmPassword;

    if (isChangingPassword) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        setError("To change password, please fill all password fields.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirm password do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = { adminID: UpdateAdminID };

      if (isChangingPassword) {
        payload.oldPassword = oldPassword;
        payload.password = newPassword; 
      }

      const response = await axios.put(
        "http://localhost:3000/api/auth/admin/updateprofile",
        payload,
        { withCredentials: true }
      );
      
      setAdminInfo(response.data.user);
      setSuccess("Profile updated successfully!");
      
      // Fields reset after success
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const serverMessage = error.response?.data?.message || error.response?.data || "Failed to update profile";
      setError(typeof serverMessage === 'string' ? serverMessage : "Route endpoint mismatch (404)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-wrapper">
      {/* Back Button */}
      <button className="update-back" onClick={() => navigate("/profile")}>
        &larr; Back to Dashboard
      </button>

      <div className="update-card">
        <div className="update-card-header">
          <div className="update-avatar">
            {adminInfo?.adminID?.charAt(0) || "A"}
          </div>
          <div>
            <h2>Update Profile</h2>
            <p>Change your Admin ID or password</p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="update-notification error">
            <span>&#9888;</span> {error}
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="update-notification success">
            <span>&#10003;</span> {success}
          </div>
        )}

        <form className="update-form" onSubmit={UpdateAdminProfile}>
          <div className="update-field">
            <label>Admin ID</label>
            <input
              type="text"
              placeholder="Update Admin ID"
              value={UpdateAdminID}
              autoComplete="new-id"
              onChange={(e) => setUpdateAdminID(e.target.value)}
              required
            />
          </div>

          <div className="update-field">
            <label>Current Password</label>
            <input
              type="password"
              placeholder="Enter current password"
              value={oldPassword}
              autoComplete="current-password"
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>

          <div className="update-field">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              autoComplete="new-password"
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="update-field">
            <label>Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <span className="update-hint">Leave password fields blank to keep current password</span>
          </div>

          <div className="update-btn-row">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate("/profile")}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading ? <span className="update-spinner"></span> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdateProfile;