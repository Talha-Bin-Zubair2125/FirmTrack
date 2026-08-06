import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../stylings/Attendance.css";
import API from "../src/api/axios";

function ViewAttendance() {
  const navigate = useNavigate();

  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Default to today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [searchTerm, setSearchTerm] = useState("");

  const fetchAttendanceByDate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Adjust endpoint according to your backend route if necessary
      const res = await API.get("/admin/attendance/getbydate", {
        params: { date: selectedDate },
        withCredentials: true,
      });
      const records = res.data.attendance || res.data.records || [];
      setAttendanceData(records);
    } catch (err) {
      setError("Failed to fetch attendance records for this date.");
      console.error("Error fetching attendance:", err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendanceByDate();
  }, [fetchAttendanceByDate]);

  const filteredAttendance = attendanceData.filter((record) => {
    const name =
      record.name || record.employeeName || record.EmployeeName || "";
    const empId = record.employeeID || record.empId || "";
    const query = searchTerm.toLowerCase();
    return (
      name.toLowerCase().includes(query) || empId.toLowerCase().includes(query)
    );
  });

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

  return (
    <div className="attendance-page-container">
      {/* Full-width Top Navbar */}
      <div className="top-navbar">
        <button
          className="attendance-back"
          onClick={() => navigate("/profile")}
        >
          ← Back to Dashboard
        </button>
        <div className="brand-logo">
          <span className="brand-icon">N</span>
          <span className="brand-name">NutroAttend</span>
        </div>
      </div>

      <div className="attendance-wrapper">
        <div className="attendance-header">
          <div>
            <h1>Daily Attendance</h1>
            <p>Monitor and track employee daily check-ins and statuses</p>
          </div>
        </div>

        {error && (
          <div className="attendance-error">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="attendance-filters">
          <div className="filter-group">
            <label>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="attendance-input"
            />
          </div>

          <div className="filter-group search-group">
            <label>Search Employee:</label>
            <input
              type="text"
              placeholder="🔍 Search by Name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="attendance-input"
            />
          </div>

          <button
            className="btn-refresh"
            onClick={fetchAttendanceByDate}
            disabled={loading}
          >
            {loading ? <span className="btn-spinner"></span> : "↻ Refresh"}
          </button>
        </div>

        <div className="attendance-content-area">
          {loading ? (
            <div className="attendance-loading">
              <div className="loading-spinner"></div>
              <p>Loading attendance records...</p>
            </div>
          ) : filteredAttendance.length === 0 ? (
            <div className="attendance-empty">
              <span>📋</span>
              <h3>No records found</h3>
              <p>No attendance data available for {selectedDate}</p>
            </div>
          ) : (
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Check In Time</th>
                    <th>Status</th>
                    <th>Deduction (PKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((record, index) => {
                    const empName =
                      record.name ||
                      record.employeeName ||
                      record.EmployeeName ||
                      "N/A";
                    const empId = record.employeeID || record.empId || "N/A";
                    const checkIn = record.checkInTime
                      ? new Date(record.checkInTime).toLocaleTimeString(
                          "en-PK",
                          {
                            timeZone: "Asia/Karachi",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "N/A";

                    return (
                      <tr key={record._id || index}>
                        <td className="td-index">{index + 1}</td>
                        <td className="td-id">{empId}</td>
                        <td className="td-name">
                          <div className="emp-avatar">
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          {empName}
                        </td>
                        <td>{checkIn}</td>
                        <td>
                          <span
                            className={`status-badge ${getStatusClass(record.status)}`}
                          >
                            {record.status || "N/A"}
                          </span>
                        </td>
                        <td
                          className={`td-deduction ${record.deduction > 0 ? "has-deduction" : ""}`}
                        >
                          {record.deduction > 0
                            ? `-${record.deduction.toLocaleString()}`
                            : "0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewAttendance;
