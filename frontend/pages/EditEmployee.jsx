import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/EditEmployee.css";

function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [UpdatedemployeeID, setUpdatedEmployeeID] = useState("");
  const [UpdatedEmployeeName, setUpdatedEmployeeName] = useState("");
  const [UpdatedEmployeeEmail, setUpdatedEmployeeEmail] = useState("");
  const [UpdatedEmployeePhone, setUpdatedEmployeePhone] = useState("");
  const [UpdatedEmployeeSalary, setUpdatedEmployeeSalary] = useState("");
  const [UpdatedEmployeeRole, setUpdatedEmployeeRole] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/admin/employees/getemployee/${id}`,
        { withCredentials: true }
      );
      const emp = response.data.employee;
      setUpdatedEmployeeID(emp.employeeID || "");
      setUpdatedEmployeeName(emp.EmployeeName || "");
      setUpdatedEmployeeEmail(emp.EmployeeEmail || "");
      setUpdatedEmployeePhone(emp.EmployeePhone || "");
      setUpdatedEmployeeSalary(emp.EmployeeSalary || "");
      setUpdatedEmployeeRole(emp.EmployeeRole || "");
    } catch (error) {
      setError("Failed to fetch employee data");
      console.error("Error fetching employee data:", error);
    }
  };

  const UpdateEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await axios.put(
        `http://localhost:3000/api/admin/employees/updateemployee/${id}`,
        {
          employeeID: UpdatedemployeeID,
          EmployeeName: UpdatedEmployeeName,
          EmployeeEmail: UpdatedEmployeeEmail,
          EmployeePhone: UpdatedEmployeePhone,
          EmployeeSalary: UpdatedEmployeeSalary,
          EmployeeRole: UpdatedEmployeeRole,
        },
        { withCredentials: true }
      );
      setSuccess("Employee updated successfully!");
      setTimeout(() => navigate("/viewemployees"), 1500);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to update employee");
      console.error("Error updating employee:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editemployee-wrapper">

      <button className="editemployee-back" onClick={() => navigate("/viewemployees")}>
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

        <form className="editemployee-form" onSubmit={UpdateEmployee}>
          <div className="editemployee-grid">

            <div className="editemployee-field">
              <label>Employee ID</label>
              <input
                type="text"
                placeholder="e.g. EMP-001"
                value={UpdatedemployeeID}
                onChange={(e) => setUpdatedEmployeeID(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Employee full name"
                value={UpdatedEmployeeName}
                onChange={(e) => setUpdatedEmployeeName(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="employee@company.com"
                value={UpdatedEmployeeEmail}
                onChange={(e) => setUpdatedEmployeeEmail(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field">
              <label>Phone Number</label>
              <input
                type="text"
                placeholder="03xx-xxxxxxx"
                value={UpdatedEmployeePhone}
                onChange={(e) => setUpdatedEmployeePhone(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field">
              <label>Base Salary (PKR)</label>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={UpdatedEmployeeSalary}
                onChange={(e) => setUpdatedEmployeeSalary(e.target.value)}
                required
              />
            </div>

            <div className="editemployee-field full-width">
              <label>Role / Position</label>
              <select
                value={UpdatedEmployeeRole}
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
            <button type="button" className="btn-cancel" onClick={() => navigate("/viewemployees")}>
              Cancel
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? <span className="edit-spinner"></span> : "Save Changes →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEmployee;