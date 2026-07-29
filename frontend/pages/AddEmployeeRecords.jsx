import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/AddEmployeeRecords.css";

function AddEmployeeRecords() {
  const navigate = useNavigate();
  const [employeeID, setEmployeeID] = useState("");
  const [EmployeeName, setEmployeeName] = useState("");
  const [EmployeeEmail, setEmployeeEmail] = useState("");
  const [EmployeePhone, setEmployeePhone] = useState("");
  const [EmployeeSalary, setEmployeeSalary] = useState("");
  const [EmployeeRole, setEmployeeRole] = useState("");
  const [EmployeePassword, setEmployeePassword] = useState("employee@123");
  const [ConfirmPassword, setConfirmPassword] = useState("employee@123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const EmployeeInfo = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (EmployeePassword !== ConfirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (EmployeePassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        "http://localhost:3000/api/admin/employees/addemployee",
        {
          employeeID,
          EmployeeName,
          EmployeeEmail,
          EmployeePhone,
          EmployeeSalary,
          EmployeeRole,
          EmployeePassword,
        },
        { withCredentials: true }
      );
      setSuccess("Employee added successfully!");
      setEmployeeID("");
      setEmployeeName("");
      setEmployeeEmail("");
      setEmployeePhone("");
      setEmployeeSalary("");
      setEmployeeRole("");
      setEmployeePassword("employee@123");
      setConfirmPassword("employee@123");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to add employee");
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch = EmployeePassword === ConfirmPassword;

  return (
    <div className="addemployee-wrapper">

      <button className="addemployee-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>

      <div className="addemployee-card">
        <div className="addemployee-header">
          <div className="addemployee-icon">👤</div>
          <div>
            <h2>Add Employee</h2>
            <p>Fill in the details to add a new employee record</p>
          </div>
        </div>

        {error && (
          <div className="addemployee-notification error">
            <span>⚠</span> {error}
          </div>
        )}

        {success && (
          <div className="addemployee-notification success">
            <span>✓</span> {success}
          </div>
        )}

        <form className="addemployee-form" onSubmit={EmployeeInfo}>
          <div className="addemployee-grid">

            <div className="addemployee-field">
              <label>Employee ID</label>
              <input
                type="text"
                placeholder="e.g. EMP-001"
                value={employeeID}
                onChange={(e) => setEmployeeID(e.target.value)}
                required
              />
            </div>

            <div className="addemployee-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Employee full name"
                value={EmployeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                required
              />
            </div>

            <div className="addemployee-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="employee@company.com"
                value={EmployeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                required
              />
            </div>

            <div className="addemployee-field">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="03xx-xxxxxxx"
                value={EmployeePhone}
                onChange={(e) => setEmployeePhone(e.target.value)}
                required
              />
            </div>

            <div className="addemployee-field">
              <label>Base Salary (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={EmployeeSalary}
                onChange={(e) => setEmployeeSalary(e.target.value)}
                required
              />
            </div>
            
            <div className="addemployee-field full-width">
              <label>Role / Position</label>
              <select
                value={EmployeeRole}
                onChange={(e) => setEmployeeRole(e.target.value)}
                required
              >
                <option value="">Select Role</option>
                <option value="Manager">Manager</option>
                <option value="Office Boy">Office Boy</option>
                <option value="Designer">Designer</option>
                <option value="Editor">Editor</option>
                <option value="Accounts Officer">Accounts Officer</option>
              </select>
            </div>

            {/* ── Password Section ── */}
            <div className="addemployee-field full-width">
              <div className="password-section-header">
                <label>🔑 Login Credentials</label>
                <span className="password-hint">
                  Employee will use these to login on mobile app
                </span>
              </div>
            </div>

            <div className="addemployee-field">
              <label>Default Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Set employee password"
                  value={EmployeePassword}
                  onChange={(e) => setEmployeePassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="addemployee-field">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={ConfirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className={ConfirmPassword && !passwordMatch ? "input-error" : ""}
                />
                {ConfirmPassword && (
                  <span className="password-match-indicator">
                    {passwordMatch ? "✓" : "✗"}
                  </span>
                )}
              </div>
              {ConfirmPassword && !passwordMatch && (
                <p className="field-error">Passwords do not match</p>
              )}
            </div>

            <div className="addemployee-field full-width">
              <div className="default-password-info">
                <span>ℹ</span>
                <p>Default password is <strong>employee@123</strong> — employee can change it after first login</p>
              </div>
            </div>

          </div>

          <div className="addemployee-btn-row">
            <button type="button" className="btn-cancel" onClick={() => navigate("/profile")}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading || !passwordMatch}>
              {loading ? <span className="addemployee-spinner"></span> : "Add Employee →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEmployeeRecords;