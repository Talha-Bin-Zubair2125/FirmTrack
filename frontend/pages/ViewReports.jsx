import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../stylings/Reports.css";
import API from "../src/api/axios";

function ViewReports() {
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [activeTab, setActiveTab] = useState("summary");

  const [detailedAttendance, setDetailedAttendance] = useState([]);
  const [detailedLoading, setDetailedLoading] = useState(false);

  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await API.get("/admin/employees/getallemployees", {
          withCredentials: true,
        });
        setEmployees(res.data.employees || []);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    fetchEmployees();
  }, []);

  const fetchSummaryReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/admin/report/bymonth", {
        params: { month: selectedMonth, year: selectedYear },
        withCredentials: true,
      });
      
      const records = res.data.summary || res.data.attendance || [];

      const sorted = records.sort((a, b) =>
        (a.employeeID || "").localeCompare(b.employeeID || "", undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      );
      setSummaryData(sorted);
    } catch (err) {
      setError("Failed to fetch summary report data.");
      console.error("Error fetching summary report:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab === "summary") {
      fetchSummaryReport();
    }
  }, [activeTab, fetchSummaryReport]);

  const fetchDetailedReport = useCallback(
    async (employeeId) => {
      if (!employeeId) {
        setDetailedAttendance([]);
        return;
      }
      const emp = employees.find((e) => e._id === employeeId);
      if (!emp?.employeeID) {
        setDetailedAttendance([]);
        return;
      }

      setDetailedLoading(true);
      try {
        const res = await API.get("/admin/report/bymonth", {
          params: {
            month: selectedMonth,
            year: selectedYear,
            employeeID: emp.employeeID,
          },
          withCredentials: true,
        });

        setDetailedAttendance(res.data.attendance || []);
      } catch (err) {
        console.error("Error fetching detailed report:", err);
        setDetailedAttendance([]);
      } finally {
        setDetailedLoading(false);
      }
    },
    [employees, selectedMonth, selectedYear],
  );

  useEffect(() => {
    if (activeTab === "detailed" && selectedEmployee) {
      fetchDetailedReport(selectedEmployee);
    }
  }, [activeTab, selectedEmployee, fetchDetailedReport]);

  const filteredDropdownEmployees = employees.filter(
    (emp) =>
      (emp.EmployeeName?.toLowerCase() || "").includes(
        employeeSearchTerm.toLowerCase(),
      ) ||
      (emp.employeeID?.toLowerCase() || "").includes(
        employeeSearchTerm.toLowerCase(),
      ),
  );

  const getStatusClass = (status) => {
    const s = status?.toLowerCase().trim() || "";
    switch (s) {
      case "present":
        return "rpt-status-present";
      case "late":
        return "rpt-status-late";
      case "absent":
        return "rpt-status-absent";
      case "half-day":
      case "halfday":
        return "rpt-status-halfday";
      case "leave":
        return "rpt-status-leave";
      default:
        return "";
    }
  };

  const currentDetailedEmp =
    employees.find((e) => e._id === selectedEmployee) || {};
  const baseSalaryDetailed = Number(currentDetailedEmp.EmployeeSalary || 0);
  const totalDeductionDetailed = detailedAttendance.reduce(
    (sum, r) => sum + (r.deduction || 0),
    0,
  );
  const finalSalaryDetailed = baseSalaryDetailed - totalDeductionDetailed;

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const monthName = months[selectedMonth - 1];

      if (activeTab === "summary") {
        if (summaryData.length === 0) {
          alert("No data to print!");
          return;
        }
        doc.setFontSize(16);
        doc.text("AttendX - Monthly Summary Report", 14, 15);
        doc.setFontSize(12);
        doc.text(`Month: ${monthName} ${selectedYear}`, 14, 22);

        autoTable(doc, {
          head: [
            [
              "#",
              "Emp ID",
              "Name",
              "Present",
              "Late",
              "Half Day",
              "Leave",
              "Absent",
              "Deduction",
              "Base Salary",
              "Final Salary",
            ],
          ],
          body: summaryData.map((emp, i) => [
            i + 1,
            emp.employeeID,
            emp.name,
            emp.present,
            emp.late,
            emp.halfDay,
            emp.leave || 0,
            emp.absent,
            `-${(emp.totalDeduction || 0).toLocaleString()}`,
            (emp.salary || 0).toLocaleString(),
            ((emp.salary || 0) - (emp.totalDeduction || 0)).toLocaleString(),
          ]),
          startY: 28,
          theme: "grid",
          headStyles: { fillColor: [26, 26, 46] },
        });
        doc.save(`Summary_${monthName}_${selectedYear}.pdf`);
      } else {
        if (!selectedEmployee) {
          alert("Select an employee first!");
          return;
        }
        if (detailedAttendance.length === 0) {
          alert("No records found!");
          return;
        }
        const empName = currentDetailedEmp.EmployeeName || "Employee";
        const empIdText = currentDetailedEmp.employeeID || "";

        doc.setFontSize(16);
        doc.text("AttendX - Detailed Attendance Report", 14, 15);
        doc.setFontSize(11);
        doc.text(`Employee: ${empName} (${empIdText})`, 14, 23);
        doc.text(`Month: ${monthName} ${selectedYear}`, 14, 29);
        doc.text(
          `Base Salary: PKR ${baseSalaryDetailed.toLocaleString()}`,
          120,
          23,
        );
        doc.text(
          `Final Salary: PKR ${finalSalaryDetailed.toLocaleString()}`,
          120,
          29,
        );

        autoTable(doc, {
          head: [["#", "Date", "Check In Time", "Status", "Deduction (PKR)"]],
          body: detailedAttendance.map((r, i) => {
            const formattedDate = r.date
              ? new Date(r.date).toLocaleDateString("en-PK", {
                  timeZone: "Asia/Karachi",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })
              : "N/A";
            const formattedTime = r.checkInTime
              ? new Date(r.checkInTime).toLocaleTimeString("en-PK", {
                  timeZone: "Asia/Karachi",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A";

            return [
              i + 1,
              formattedDate,
              formattedTime,
              r.status || "N/A",
              r.deduction > 0 ? `-${r.deduction.toLocaleString()}` : "0",
            ];
          }),
          startY: 36,
          theme: "grid",
          headStyles: { fillColor: [26, 26, 46] },
        });
        doc.save(
          `Detailed_${empName.replace(/\s+/g, "_")}_${monthName}_${selectedYear}.pdf`,
        );
      }
    } catch (err) {
      console.error("PDF error:", err);
      alert("PDF generation failed.");
    }
  };

  return (
    <div className="rpt-page-container">
      {/* Full-width Top Navbar */}
      <div className="rpt-top-navbar">
        <button className="rpt-back-btn" onClick={() => navigate("/profile")}>
          ← Back to Dashboard
        </button>
        <div className="rpt-brand-logo">
          <span className="rpt-brand-icon">N</span>
          <span className="rpt-brand-name">NutroAttend</span>
        </div>
      </div>

      <div className="rpt-wrapper">
        <div className="rpt-header">
          <div>
            <h1>Reports</h1>
            <p>Monthly attendance and salary summary</p>
          </div>
        </div>

        {error && (
          <div className="rpt-error-banner">
            <span>⚠</span> {error}
          </div>
        )}

        <div className="rpt-filters">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="rpt-select"
          >
            {months.map((month, index) => (
              <option key={index} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rpt-select"
          >
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <div className="rpt-action-buttons">
            <button
              className="rpt-btn-generate"
              onClick={fetchSummaryReport}
              disabled={loading}
            >
              {loading ? (
                <span className="rpt-btn-spinner"></span>
              ) : (
                "↻ Generate Report"
              )}
            </button>
            <button
              className="rpt-btn-generate rpt-btn-pdf"
              onClick={handleDownloadPDF}
              disabled={loading || detailedLoading}
            >
              📥 Download PDF
            </button>
          </div>
        </div>

        <div className="rpt-tabs">
          <button
            className={`rpt-tab-btn ${activeTab === "summary" ? "rpt-tab-active" : ""}`}
            onClick={() => setActiveTab("summary")}
          >
            📊 Monthly Summary
          </button>
          <button
            className={`rpt-tab-btn ${activeTab === "detailed" ? "rpt-tab-active" : ""}`}
            onClick={() => setActiveTab("detailed")}
          >
            📋 Detailed View
          </button>
        </div>

        <div className="rpt-content-area">
          {activeTab === "summary" &&
            (loading ? (
              <div className="rpt-loading-state">
                <div className="rpt-loading-spinner"></div>
                <p>Generating report...</p>
              </div>
            ) : summaryData.length === 0 ? (
              <div className="rpt-empty-state">
                <span>📊</span>
                <h3>
                  No data for {months[selectedMonth - 1]} {selectedYear}
                </h3>
                <p>No attendance records found</p>
              </div>
            ) : (
              <div className="rpt-table-wrapper">
                <table className="rpt-table" style={{ minWidth: "850px" }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Present</th>
                      <th>Late</th>
                      <th>Half Day</th>
                      <th>Leave</th>
                      <th>Absent</th>
                      <th>Total Deduction</th>
                      <th>Base Salary</th>
                      <th>Final Salary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map((emp, index) => (
                      <tr key={index}>
                        <td className="rpt-td-index">{index + 1}</td>
                        <td className="rpt-td-id">{emp.employeeID}</td>
                        <td className="rpt-td-name">
                          <div className="rpt-emp-avatar">
                            {emp.EmployeeName?.charAt(0).toUpperCase() || "?"}
                          </div>
                          {emp.EmployeeName}
                        </td>
                        <td>
                          <span className="rpt-status-badge rpt-status-present">
                            {emp.present}
                          </span>
                        </td>
                        <td>
                          <span className="rpt-status-badge rpt-status-late">
                            {emp.late}
                          </span>
                        </td>
                        <td>
                          <span className="rpt-status-badge rpt-status-halfday">
                            {emp.halfDay}
                          </span>
                        </td>
                        <td>
                          <span className="rpt-status-badge rpt-status-leave">
                            {emp.leave || 0}
                          </span>
                        </td>
                        <td>
                          <span className="rpt-status-badge rpt-status-absent">
                            {emp.absent}
                          </span>
                        </td>
                        <td className="rpt-td-deduction rpt-has-deduction">
                          -{(emp.totalDeduction || 0).toLocaleString()}
                        </td>
                        <td className="rpt-td-salary">
                          {(emp.salary || 0).toLocaleString()}
                        </td>
                        <td className="rpt-td-final-salary">
                          {(
                            (emp.salary || 0) - (emp.totalDeduction || 0)
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {activeTab === "detailed" && (
            <div className="rpt-detailed-tab-content">
              <div className="rpt-detailed-filter">
                <label>Select Employee:</label>
                <div className="rpt-dropdown-container">
                  <input
                    type="text"
                    className="rpt-select rpt-search-input"
                    placeholder="🔍 Search Employee Name or ID..."
                    value={employeeSearchTerm}
                    onChange={(e) => {
                      setEmployeeSearchTerm(e.target.value);
                      setIsDropdownOpen(true);
                      if (e.target.value === "") setSelectedEmployee("");
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setIsDropdownOpen(false), 200)
                    }
                  />
                  {isDropdownOpen && (
                    <ul className="rpt-dropdown-list">
                      {filteredDropdownEmployees.length > 0 ? (
                        filteredDropdownEmployees.map((emp) => (
                          <li
                            key={emp._id}
                            className="rpt-dropdown-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedEmployee(emp._id);
                              setEmployeeSearchTerm(
                                `${emp.employeeID} - ${emp.EmployeeName}`,
                              );
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="rpt-dropdown-emp-id">
                              {emp.employeeID}
                            </span>
                            <span className="rpt-dropdown-emp-name">
                              {emp.EmployeeName}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="rpt-dropdown-empty">
                          No employee found
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              {!selectedEmployee ? (
                <div className="rpt-empty-state">
                  <span>👤</span>
                  <h3>Select an employee</h3>
                  <p>
                    Search and select an employee to view their detailed
                    attendance
                  </p>
                </div>
              ) : detailedLoading ? (
                <div className="rpt-loading-state">
                  <div className="rpt-loading-spinner"></div>
                  <p>Generating report...</p>
                </div>
              ) : detailedAttendance.length === 0 ? (
                <div className="rpt-empty-state">
                  <span>📋</span>
                  <h3>No records found</h3>
                  <p>
                    No attendance for this employee in{" "}
                    {months[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>
              ) : (
                <div className="rpt-table-wrapper">
                  <div className="rpt-detailed-summary-card">
                    <div className="rpt-summary-item">
                      <h4>Total Days</h4>
                      <p>{detailedAttendance.length}</p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Present</h4>
                      <p className="rpt-text-green">
                        {
                          detailedAttendance.filter(
                            (r) => r.status?.toLowerCase() === "present",
                          ).length
                        }
                      </p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Late</h4>
                      <p className="rpt-text-orange">
                        {
                          detailedAttendance.filter(
                            (r) => r.status?.toLowerCase() === "late",
                          ).length
                        }
                      </p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Half Day</h4>
                      <p className="rpt-text-purple">
                        {
                          detailedAttendance.filter((r) =>
                            r.status?.toLowerCase().includes("half"),
                          ).length
                        }
                      </p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Leave</h4>
                      <p className="rpt-text-blue">
                        {
                          detailedAttendance.filter(
                            (r) => r.status?.toLowerCase() === "leave",
                          ).length
                        }
                      </p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Absent</h4>
                      <p className="rpt-text-red">
                        {
                          detailedAttendance.filter(
                            (r) => r.status?.toLowerCase() === "absent",
                          ).length
                        }
                      </p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Total Deduction</h4>
                      <p className="rpt-text-red">
                        -{totalDeductionDetailed.toLocaleString()}
                      </p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Base Salary</h4>
                      <p>Rs. {baseSalaryDetailed.toLocaleString()}</p>
                    </div>
                    <div className="rpt-summary-item">
                      <h4>Final Salary</h4>
                      <p className="rpt-text-green">
                        Rs. {finalSalaryDetailed.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <table className="rpt-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Date</th>
                        <th>Check In Time</th>
                        <th>Status</th>
                        <th>Deduction (PKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedAttendance.map((record, index) => (
                        <tr
                          key={record._id || `virtual-${record.date}-${index}`}
                        >
                          <td className="rpt-td-index">{index + 1}</td>
                          <td>
                            {record.date
                              ? new Date(record.date).toLocaleDateString(
                                  "en-PK",
                                  {
                                    timeZone: "Asia/Karachi",
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                  },
                                )
                              : "N/A"}
                          </td>
                          <td>
                            {record.checkInTime
                              ? new Date(record.checkInTime).toLocaleTimeString(
                                  "en-PK",
                                  {
                                    timeZone: "Asia/Karachi",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "N/A"}
                          </td>
                          <td>
                            <span
                              className={`rpt-status-badge ${getStatusClass(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td
                            className={`rpt-td-deduction ${record.deduction > 0 ? "rpt-has-deduction" : ""}`}
                          >
                            {record.deduction > 0
                              ? `-${record.deduction.toLocaleString()}`
                              : "0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewReports;
