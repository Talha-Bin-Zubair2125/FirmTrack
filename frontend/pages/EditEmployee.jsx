import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../stylings/EditEmployee.css";
import API from "../src/api/axios";

function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [updatedEmployeeID, setUpdatedEmployeeID] = useState("");
  const [updatedEmployeeName, setUpdatedEmployeeName] = useState("");
  const [updatedEmployeeEmail, setUpdatedEmployeeEmail] = useState("");
  const [updatedEmployeePhone, setUpdatedEmployeePhone] = useState("");
  const [updatedEmployeeSalary, setUpdatedEmployeeSalary] = useState("");
  const [updatedEmployeeRole, setUpdatedEmployeeRole] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEmployeeData = useCallback(async () => {
    try {
      const response = await API.get(`/admin/employees/getemployee/${id}`, {
        withCredentials: true,
      });
      const emp = response.data.employee;
      setUpdatedEmployeeID(emp.employeeID || "");
      setUpdatedEmployeeName(emp.EmployeeName || "");
      setUpdatedEmployeeEmail(emp.EmployeeEmail || "");
      setUpdatedEmployeePhone(emp.EmployeePhone || "");
      setUpdatedEmployeeSalary(emp.EmployeeSalary || "");
      setUpdatedEmployeeRole(emp.EmployeeRole || "");
    } catch (err) {
      setError("Failed to fetch employee data");
      console.error("Error fetching employee data:", err);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  const updateEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await API.put(
        `/admin/employees/updateemployee/${id}`,
        {
          employeeID: updatedEmployeeID,
          EmployeeName: updatedEmployeeName,
          EmployeeEmail: updatedEmployeeEmail,
          EmployeePhone: updatedEmployeePhone,
          EmployeeSalary: updatedEmployeeSalary,
          EmployeeRole: updatedEmployeeRole,
        },
        { withCredentials: true },
      );
      setSuccess("Employee updated successfully!");
      setTimeout(() => navigate("/viewemployees"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update employee");
      console.error("Error updating employee:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editemployee-wrapper">
      <div className="editemployee-topbar">
        <button
          className="editemployee-back"
          onClick={() => navigate("/viewemployees")}
        >
          &larr; Back to Employees
        </button>
        <div className="editemployee-brand">
          <span className="brand-logo">N</span>
          <h2>NutroAttend</h2>
        </div>
      </div>

      <div className="editemployee-container">
        <div className="editemployee-card">
          <div className="editemployee-header">
            <div className="editemployee-icon">✏️</div>
            <div>
              <h2>Edit Employee Profile</h2>
              <p>
                Update employment record details, credentials, and role
                assignments
              </p>
            </div>
          </div>

          {error && (
            <div
              className="editemployee-notification error"
              onClick={() => setError("")}
            >
              <span>⚠</span>
              <div>
                <strong>Error</strong>
                <p>{error}</p>
              </div>
              <button className="notif-close">✕</button>
            </div>
          )}

          {success && (
            <div
              className="editemployee-notification success"
              onClick={() => setSuccess("")}
            >
              <span>✓</span>
              <div>
                <strong>Success</strong>
                <p>{success}</p>
              </div>
              <button className="notif-close">✕</button>
            </div>
          )}

          <form className="editemployee-form" onSubmit={updateEmployee}>
            <div className="editemployee-grid">
              <div className="editemployee-field">
                <label>Employee ID</label>
                <p className="field-hint">Unique identification code</p>
                <input
                  type="text"
                  placeholder="e.g. EMP-001"
                  value={updatedEmployeeID}
                  onChange={(e) => setUpdatedEmployeeID(e.target.value)}
                  required
                />
              </div>

              <div className="editemployee-field">
                <label>Full Name</label>
                <p className="field-hint">Employee's legal full name</p>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={updatedEmployeeName}
                  onChange={(e) => setUpdatedEmployeeName(e.target.value)}
                  required
                />
              </div>

              <div className="editemployee-field">
                <label>Email Address</label>
                <p className="field-hint">Corporate or active email address</p>
                <input
                  type="email"
                  placeholder="employee@company.com"
                  value={updatedEmployeeEmail}
                  onChange={(e) => setUpdatedEmployeeEmail(e.target.value)}
                  required
                />
              </div>

              <div className="editemployee-field">
                <label>Phone Number</label>
                <p className="field-hint">Active contact phone number</p>
                <input
                  type="text"
                  placeholder="03xx-xxxxxxx"
                  value={updatedEmployeePhone}
                  onChange={(e) => setUpdatedEmployeePhone(e.target.value)}
                  required
                />
              </div>

              <div className="editemployee-field">
                <label>Base Salary (PKR)</label>
                <p className="field-hint">Monthly base compensation amount</p>
                <div className="input-prefix">
                  <span>PKR</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={updatedEmployeeSalary}
                    onChange={(e) => setUpdatedEmployeeSalary(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="editemployee-field">
                <label>Role / Position</label>
                <p className="field-hint">Assigned organizational role</p>
                <select
                  value={updatedEmployeeRole}
                  onChange={(e) => setUpdatedEmployeeRole(e.target.value)}
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
            </div>

            <div className="editemployee-btn-row">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/viewemployees")}
              >
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? (
                  <span className="edit-spinner"></span>
                ) : (
                  "Save Changes →"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditEmployee;
