import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/ViewAttendance.css";

function ViewAttendance() {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [attendance, searchName, filterMonth, filterStatus]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:3000/api/admin/attendance/getall",
        { withCredentials: true }
      );
      
      // 🔥 FIX: Jo employees delete ho chuke hain unko list se hata diya
      const validRecords = response.data.attendance.filter(
        (record) => record.employeeId !== null && record.employeeId !== undefined
      );

      setAttendance(validRecords);
    } catch (error) {
      setError("Failed to fetch attendance records");
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const toPKT = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr); 
  };

  const formatDatePKT = (dateStr) => {
    const pktDate = toPKT(dateStr);
    if (!pktDate) return "—";
    return pktDate.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const formatTimePKT = (dateStr) => {
    const pktDate = toPKT(dateStr);
    if (!pktDate) return "—";
    return pktDate.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }).toLowerCase(); 
  };

  const applyFilters = () => {
    let result = [...attendance];

    // filter by name or ID
    if (searchName) {
      result = result.filter((a) =>
        a.employeeId?.EmployeeName?.toLowerCase().includes(searchName.toLowerCase()) ||
        a.employeeId?.employeeID?.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    // filter by month
    if (filterMonth) {
      result = result.filter((a) => a.month === parseInt(filterMonth));
    }

    // filter by status
    if (filterStatus) {
      result = result.filter((a) => a.status === filterStatus);
    }

    setFiltered(result);
  };

  const clearFilters = () => {
    setSearchName("");
    setFilterMonth("");
    setFilterStatus("");
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "present": return "status-present";
      case "late": return "status-late";
      case "absent": return "status-absent";
      case "half-day": return "status-halfday";
      default: return "";
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="attendance-wrapper">

      <button className="attendance-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>

      <div className="attendance-header">
        <div>
          <h1>Attendance Records</h1>
          <p><span>{filtered.length}</span> records found</p>
        </div>
      </div>

      {error && (
        <div className="attendance-error">
          <span>⚠</span> {error}
        </div>
      )}

      {/* ── Filters ── */}
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
            <option key={index} value={index + 1}>{month}</option>
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

      {/* ── Table ── */}
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
                <tr key={record._id}>
                  <td className="td-index">{index + 1}</td>
                  <td className="td-id">{record.employeeId?.employeeID || "—"}</td>
                  <td className="td-name">
                    <div className="emp-avatar">
                      {record.employeeId?.EmployeeName?.charAt(0).toUpperCase() || "?"}
                    </div>
                    {record.employeeId?.EmployeeName || "—"}
                  </td>
                  <td>
                    <span className="role-badge">{record.employeeId?.EmployeeRole || "—"}</span>
                  </td>
                  <td>{formatDatePKT(record.date)}</td>
                  <td>{record.status === "absent" ? "—" : formatTimePKT(record.checkInTime)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className={`td-deduction ${record.deduction > 0 ? "has-deduction" : ""}`}>
                    {record.deduction > 0 ? `-${record.deduction.toLocaleString()}` : "0"}
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