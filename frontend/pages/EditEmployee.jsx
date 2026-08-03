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
      <button
        className="editemployee-back"
        onClick={() => navigate("/viewemployees")}
      >
        ← Back to Employees
      </button>

      <div className="editemployee-card">
        <div className="editemployee-header">
          <div className="editemployee-icon">✏️</div>
          <div>
            <h2>Edit Employee</h2>
            <p>Update the employee record details</p>
          </div>
        </div>

        {error && (
          <div className="editemployee-notification error">
            <span>⚠</span> {error}
          </div>
        )}
        {success && (
          <div className="editemployee-notification success">
            <span>✓</span> {success}
          </div>
        )}

        <form className="editemployee-form" onSubmit={updateEmployee}>
          <div className="editemployee-grid">
            <div className="editemployee-field">
              <label>Employee ID</label>
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
              <input
                type="text"
                placeholder="Employee full name"
                value={updatedEmployeeName}
                onChange={(e) => setUpdatedEmployeeName(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field">
              <label>Email Address</label>
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
              <input
                type="number"
                placeholder="e.g. 50000"
                value={updatedEmployeeSalary}
                onChange={(e) => setUpdatedEmployeeSalary(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field full-width">
              <label>Role / Position</label>
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
  );
}

export default EditEmployee;
