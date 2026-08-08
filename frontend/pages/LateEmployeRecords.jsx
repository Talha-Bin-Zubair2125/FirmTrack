import { useState, useEffect, useCallback } from "react";
import API from "../src/api/axios";
import { useNavigate } from "react-router-dom";
import "../stylings/ViewAttendance.css";

export default function PresentEmployeeReocrds() {
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");

  const getTodayPKT = () => {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });
  };

  const [filterDate, setFilterDate] = useState(getTodayPKT());

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let response;
      if (filterDate) {
        const [year, month] = filterDate.split("-");
        const params = new URLSearchParams({
          month: parseInt(month, 10).toString(),
          year: year,
        });
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
  }, [filterDate]);

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

    result = result.filter((a) => a.status?.toLowerCase().trim() === "late");

    if (filterDate) {
      result = result.filter((a) => {
        if (!a.date) return false;
        const recordDate = new Date(a.date).toLocaleDateString("en-CA", {
          timeZone: "Asia/Karachi",
        });
        return recordDate === filterDate;
      });
    }

    if (searchName.trim()) {
      const q = searchName.toLowerCase();
      result = result.filter(
        (a) =>
          a.employeeId?.EmployeeName?.toLowerCase().includes(q) ||
          a.employeeId?.employeeID?.toLowerCase().includes(q),
      );
    }

    setFiltered(result);
  }, [attendance, searchName, filterDate]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setSearchName("");
    setFilterDate(getTodayPKT());
  };

  const getStatusClass = (status) => {
    const s = status?.toLowerCase().trim() || "";
    switch (s) {
      case "late":
        return "status-late";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="attendance-wrapper">
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
              <h1>Late Employees</h1>
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

            <div className="filter-search">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="filter-date-input"
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  color: "inherit",
                }}
              />
            </div>

            {(searchName || filterDate !== getTodayPKT()) && (
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
              <p>
                Try adjusting your search filters or select a different date.
              </p>
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
                        {record.status === "leave" || !record.checkInTime
                          ? "—"
                          : formatTimePKT(record.checkInTime)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${getStatusClass(
                            record.status,
                          )}`}
                        >
                          {record.status || "—"}
                        </span>
                      </td>
                      <td
                        className={`td-deduction ${
                          Number(record.deduction) > 0 ? "has-deduction" : ""
                        }`}
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
    </>
  );
}
