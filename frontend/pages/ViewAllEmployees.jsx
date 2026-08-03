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
      <button className="employees-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>
      <div className="employees-header">
        <div>
          <h1>Employees</h1>
          <p>
            <span>{employees.length}</span> total records
          </p>
        </div>
        <button
          className="btn-add-employee"
          onClick={() => navigate("/addemployee")}
        >
          + Add Employee
        </button>
      </div>
      {error && (
        <div
          className="employees-notification error"
          onClick={() => setError("")}
        >
          <span>⚠</span> {error}
          <button className="notif-close">✕</button>
        </div>
      )}
      {success && (
        <div
          className="employees-notification success"
          onClick={() => setSuccess("")}
        >
          <span>✓</span> {success}
          <button className="notif-close">✕</button>
        </div>
      )}
      <div className="employees-search">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by name, ID or role..."
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
          <p>Loading employees...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="employees-empty">
          <span>👥</span>
          <h3>No employees found</h3>
          <p>
            {search
              ? "Try a different search term"
              : "Add your first employee to get started"}
          </p>
          {!search && (
            <button onClick={() => navigate("/addemployee")}>
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
                <th>Actions</th>
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
                    {emp.EmployeeName}
                  </td>
                  <td>{emp.EmployeeEmail}</td>
                  <td>{emp.EmployeePhone}</td>
                  <td>
                    <span className="role-badge">{emp.EmployeeRole}</span>
                  </td>
                  <td className="td-salary">
                    {emp.EmployeeSalary
                      ? Number(emp.EmployeeSalary).toLocaleString()
                      : "—"}
                  </td>
                  <td>
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
      {deleteId && (
        <div className="delete-overlay" onClick={() => setDeleteId(null)}>
          <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon">🗑</div>
            <h3>Delete Employee?</h3>
            <p>
              This action cannot be undone. The employee record will be
              permanently removed.
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
