import { useContext, useState } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import "../stylings/LoginPage.css";
import API from "../src/api/axios";

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
      const response = await API.post(
        "/auth/admin/login",
        { adminID, password },
        { withCredentials: true },
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
      setTimeout(() => setError(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="login-brand-container">
          <div className="login-brand-icon">N</div>
          <span className="login-brand-name">NutroAttend</span>
        </div>
        <div className="login-hero-content">
          <h1>Smart Attendance & Payroll Management</h1>
          <p>
            Manage your workforce smarter, track attendance seamlessly, and
            streamline reports all in one powerful platform.
          </p>
        </div>
        <div className="login-decoration-dots">
          <span className="dot active"></span>
          <span className="dot"></span>
          <span className="dot"></span>
        </div>
      </div>
      <div className="login-right">
        <div className="mobile-brand">
          <div className="login-brand-icon">N</div>
          <span className="login-brand-name">NutroAttend</span>
        </div>
        <div className="login-card">
          <div className="login-card-header">
            <h2>Welcome Back</h2>
            <p>Please enter your credentials to access the admin portal</p>
          </div>
          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}
          <form className="login-form" onSubmit={UserLogin}>
            <div className="login-field">
              <label htmlFor="adminID">Admin ID</label>
              <div className="input-container">
                <input
                  id="adminID"
                  type="text"
                  placeholder="Enter your Admin ID"
                  value={adminID}
                  autoComplete="off"
                  onChange={(e) => setAdminID(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="input-container">
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <span className="login-spinner"></span> : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
