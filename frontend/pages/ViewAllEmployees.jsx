import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../stylings/ViewAllEmployees.css";
import API from "../src/api/axios";

function ViewAllEmployees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const sortEmployeesSequence = (employeeList) => {
    return [...employeeList].sort((a, b) => {
      const idA = a.employeeID || "";
      const idB = b.employeeID || "";
      return idA.localeCompare(idB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get("/admin/employees/getallemployees", {
        withCredentials: true,
      });
      const sortedData = sortEmployeesSequence(response.data.employees || []);
      setEmployees(sortedData);
      setAllEmployees(sortedData);
    } catch (error) {
      setError("Failed to fetch employees. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const SearchUser = useCallback(async (query) => {
    setSearching(true);
    try {
      const response = await API.get(`/admin/employees/search?query=${query}`, {
        withCredentials: true,
      });
      const sortedSearchData = sortEmployeesSequence(
        response.data.employees || [],
      );
      setEmployees(sortedSearchData);
    } catch (error) {
      setError("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setEmployees(allEmployees);
      return;
    }
    const debounce = setTimeout(() => {
      SearchUser(search);
    }, 400);
    return () => clearTimeout(debounce);
  }, [search, allEmployees, SearchUser]);

  const clearSearch = () => {
    setSearch("");
    setEmployees(allEmployees);
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/admin/employees/deleteemployee/${id}`, {
        withCredentials: true,
      });
      const updated = employees.filter((emp) => emp._id !== id);
      setEmployees(updated);
      setAllEmployees(updated);
      setDeleteId(null);
      setSuccess("Employee deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      setError("Failed to delete employee. Please try again.");
      setDeleteId(null);
    }
  };

  return (
    <div className="employees-wrapper">
      <div className="employees-topbar">
        <button className="employees-back" onClick={() => navigate("/profile")}>
          &larr; Back to Dashboard
        </button>
        <div className="employees-brand">
          <span className="brand-logo">N</span>
          <h2>NutroAttend</h2>
        </div>
      </div>

      <div className="employees-container">
        {error && (
          <div
            className="employees-notification error"
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
            className="employees-notification success"
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

        <div className="employees-card">
          <div className="employees-card-header">
            <div className="employees-header-info">
              <div className="employees-icon">👥</div>
              <div>
                <h2>Employee Directory</h2>
                <p>Manage records, roles, and compensation details</p>
              </div>
            </div>
            <div className="employees-header-actions">
              <span className="employees-count-badge">
                <strong>{employees.length}</strong> total records
              </span>
              <button
                className="btn-add-employee"
                onClick={() => navigate("/addemployee")}
              >
                + Add Employee
              </button>
            </div>
          </div>

          <div className="employees-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by name, ID, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && <span className="search-spinner"></span>}
            {search && !searching && (
              <button className="search-clear" onClick={clearSearch}>
                ✕
              </button>
            )}
          </div>

          {loading ? (
            <div className="employees-loading">
              <div className="loading-spinner"></div>
              <p>Loading employee directory...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="employees-empty">
              <span>📭</span>
              <h3>No employees found</h3>
              <p>
                {search
                  ? "No records match your search criteria. Try a different query."
                  : "Get started by adding your first employee record."}
              </p>
              {!search && (
                <button
                  className="btn-add-empty"
                  onClick={() => navigate("/addemployee")}
                >
                  + Add Employee
                </button>
              )}
            </div>
          ) : (
            <div className="employees-table-wrapper">
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Salary (PKR)</th>
                    <th>Joined On</th>
                    <th className="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => (
                    <tr key={emp._id}>
                      <td className="td-index">{index + 1}</td>
                      <td className="td-id">{emp.employeeID}</td>
                      <td className="td-name">
                        <div className="employee-avatar">
                          {emp.EmployeeName?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="employee-name-text">
                          {emp.EmployeeName}
                        </span>
                      </td>
                      <td className="td-email">{emp.EmployeeEmail}</td>
                      <td className="td-phone">{emp.EmployeePhone}</td>
                      <td>
                        <span className="role-badge">{emp.EmployeeRole}</span>
                      </td>
                      <td className="td-salary">
                        {emp.EmployeeSalary
                          ? Number(emp.EmployeeSalary).toLocaleString()
                          : "—"}
                      </td>
                      <td className="td-date">
                        {emp.createdAt
                          ? new Date(emp.createdAt).toLocaleDateString("en-PK")
                          : "—"}
                      </td>
                      <td className="td-actions">
                        <button
                          className="btn-edit"
                          onClick={() => navigate(`/editemployee/${emp._id}`)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => setDeleteId(emp._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <div className="delete-overlay" onClick={() => setDeleteId(null)}>
          <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon">🗑</div>
            <h3>Delete Employee Record?</h3>
            <p>
              This action cannot be undone. The employee profile and associated
              data will be permanently removed from the system.
            </p>
            <div className="delete-btn-row">
              <button className="btn-cancel" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                className="btn-confirm-delete"
                onClick={() => handleDelete(deleteId)}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewAllEmployees;
