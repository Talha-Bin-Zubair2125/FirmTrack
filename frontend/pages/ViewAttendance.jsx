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
  const [filterYear, setFilterYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [filterEmployeeID, setFilterEmployeeID] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Fetch attendance based on whether a month is selected
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let response;
      if (filterMonth) {
        const params = new URLSearchParams({
          month: filterMonth,
          year: filterYear,
        });
        if (filterEmployeeID.trim()) {
          params.append("employeeID", filterEmployeeID.trim());
        }
        response = await API.get(
          `/admin/attendance/getbymonth?${params.toString()}`,
          {
            withCredentials: true,
          },
        );
      } else {
        response = await API.get("/admin/attendance/getall", {
          withCredentials: true,
        });
      }

      const records = response.data.attendance || response.data.records || [];
      const validRecords = records.filter(
        (record) =>
          record.employeeId !== null && record.employeeId !== undefined,
      );
      setAttendance(validRecords);
    } catch (err) {
      setError("Failed to fetch attendance records. Please try again.");
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear, filterEmployeeID]);

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

    if (filterStatus) {
      result = result.filter((a) => a.status === filterStatus);
    }

    setFiltered(result);
  }, [attendance, searchName, filterStatus]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setSearchName("");
    setFilterMonth("");
    setFilterYear(new Date().getFullYear().toString());
    setFilterEmployeeID("");
    setFilterStatus("");
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase().trim() || "";
    switch (s) {
      case "present":
        return "status-present";
      case "late":
        return "status-late";
      case "absent":
        return "status-absent";
      case "half-day":
      case "halfday":
        return "status-halfday";
      case "leave":
        return "status-leave";
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
      {/* Full-width Top Navbar */}
      <div className="attendance-topbar">
        <button
          className="attendance-back"
          onClick={() => navigate("/profile")}
        >
          &larr; Back to Dashboard
        </button>
        <div className="topbar-brand">
          <span className="brand-logo">N</span>
          <h2>NutroAttend</h2>
        </div>
      </div>

      <div className="attendance-container">
        <div className="attendance-header">
          <div>
            <h1>Attendance Records</h1>
            <p>
              <span>{filtered.length}</span> records found
            </p>
          </div>
        </div>

        {error && (
          <div className="attendance-error" onClick={() => setError("")}>
            <span>⚠</span> {error}
          </div>
        )}

        <div className="attendance-filters">
          <div className="filter-search">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Filter by name or employee ID..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>

          <input
            type="text"
            className="filter-input"
            placeholder="Specific Emp ID (Optional)"
            value={filterEmployeeID}
            onChange={(e) => setFilterEmployeeID(e.target.value)}
            title="Provide specific Employee ID when filtering by month"
          />

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="filter-select"
          >
            <option value="">All Months (General View)</option>
            {months.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>

          {filterMonth && (
            <input
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="filter-input-year"
              placeholder="Year"
            />
          )}

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
            <option value="leave">Leave</option>
          </select>

          {(searchName || filterMonth || filterEmployeeID || filterStatus) && (
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
            <p>Try adjusting your search filters or select a month/year</p>
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
                      {record.status === "absent" ||
                      record.status === "leave" ||
                      !record.checkInTime
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
    </div>
  );
}

export default ViewAttendance;
