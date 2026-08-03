import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../stylings/ViewAttendance.css";
import API from "../src/api/axios";

function ViewAttendance() {
  
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.get("/admin/attendance/getall", {
        withCredentials: true,
      });
      const validRecords = (response.data.attendance || []).filter(
        (record) =>
          record.employeeId !== null && record.employeeId !== undefined,
      );
      setAttendance(validRecords);
    } catch (error) {
      setError("Failed to fetch attendance records");
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const formatDatePKT = (dateStr) => {
    if (!dateStr) return "—";
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return "—";
    return dateObj.toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTimePKT = (dateStr) => {
    if (!dateStr) return "—";
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return "—";
    return dateObj
      .toLocaleTimeString("en-PK", {
        timeZone: "Asia/Karachi",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const applyFilters = useCallback(() => {
    let result = [...attendance];

    if (searchName.trim()) {
      const q = searchName.toLowerCase();
      result = result.filter(
        (a) =>
          a.employeeId?.EmployeeName?.toLowerCase().includes(q) ||
          a.employeeId?.employeeID?.toLowerCase().includes(q),
      );
    }

    if (filterMonth) {
      result = result.filter((a) => {
        if (a.month !== undefined) return a.month === parseInt(filterMonth);
        if (a.date)
          return new Date(a.date).getMonth() + 1 === parseInt(filterMonth);
        return false;
      });
    }

    if (filterStatus) {
      result = result.filter((a) => a.status === filterStatus);
    }

    setFiltered(result);
  }, [attendance, searchName, filterMonth, filterStatus]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setSearchName("");
    setFilterMonth("");
    setFilterStatus("");
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "present":
        return "status-present";
      case "late":
        return "status-late";
      case "absent":
        return "status-absent";
      case "half-day":
        return "status-halfday";
      default:
        return "";
    }
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="attendance-wrapper">
      <button className="attendance-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>

      <div className="attendance-header">
        <div>
          <h1>Attendance Records</h1>
          <p>
            <span>{filtered.length}</span> records found
          </p>
        </div>
      </div>

      {error && (
        <div className="attendance-error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="attendance-filters">
        <div className="filter-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by name or employee ID..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </div>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="filter-select"
        >
          <option value="">All Months</option>
          {months.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="half-day">Half Day</option>
        </select>

        {(searchName || filterMonth || filterStatus) && (
          <button className="filter-clear" onClick={clearFilters}>
            ✕ Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="attendance-loading">
          <div className="loading-spinner"></div>
          <p>Loading records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="attendance-empty">
          <span>📋</span>
          <h3>No records found</h3>
          <p>Try adjusting your filters</p>
        </div>
      ) : (
        <div className="attendance-table-wrapper">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Date (PKT)</th>
                <th>Check In (PKT)</th>
                <th>Status</th>
                <th>Deduction (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, index) => (
                <tr key={record._id || index}>
                  <td className="td-index">{index + 1}</td>
                  <td className="td-id">
                    {record.employeeId?.employeeID || "—"}
                  </td>
                  <td className="td-name">
                    <div className="emp-avatar">
                      {record.employeeId?.EmployeeName?.charAt(
                        0,
                      ).toUpperCase() || "?"}
                    </div>
                    {record.employeeId?.EmployeeName || "—"}
                  </td>
                  <td>
                    <span className="role-badge">
                      {record.employeeId?.EmployeeRole || "—"}
                    </span>
                  </td>
                  <td>{formatDatePKT(record.date)}</td>
                  <td>
                    {record.status === "absent"
                      ? "—"
                      : formatTimePKT(record.checkInTime)}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(record.status)}`}
                    >
                      {record.status || "—"}
                    </span>
                  </td>
                  <td
                    className={`td-deduction ${Number(record.deduction) > 0 ? "has-deduction" : ""}`}
                  >
                    {Number(record.deduction) > 0
                      ? `-${Number(record.deduction).toLocaleString()}`
                      : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ViewAttendance;
