import React, { useContext, useState } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/LoginPage.css";

function LoginPage() {
  const { setAdminInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [adminID, setAdminID] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const UserLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3000/api/auth/admin/login",
        { adminID, password },
        { withCredentials: true }
      );
      setAdminInfo(response.data.user);
      navigate("/profile");
    } catch (error) {
      if (error.response?.status === 401) {
        setError("Invalid Admin ID or Password");
      } else if (error.response?.status === 400) {
        setError(error.response.data.message);
      } else {
        setError("Server error. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">A</div>
          <span>AttendX</span>
        </div>
        <h1>Attendance<br />Management<br /><span>System</span></h1>
        <p>Manage your workforce smarter. Track attendance, salaries and reports — all in one place.</p>
        <div className="login-dots">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-header">
            <h2>Admin Login</h2>
            <p>Sign in to access your dashboard</p>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠</span>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={UserLogin}>
            <div className="login-field">
              <label>Admin ID</label>
              <input
                type="text"
                placeholder="Enter your Admin ID"
                value={adminID}
                autoComplete="off"
                onChange={(e) => setAdminID(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="login-spinner"></span>
              ) : (
                "Sign In →"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;