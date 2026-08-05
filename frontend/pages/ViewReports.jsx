import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../stylings/Reports.css";
import API from "../src/api/axios";

function ViewReports() {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deductionSettings, setDeductionSettings] = useState(null);
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

  const getPKTDateParts = (dateInput = new Date()) => {
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) return null;

    const dateStringPKT = dateObj.toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    const [year, month, day] = dateStringPKT.split("-").map(Number);
    return { year, month, day };
  };

  const getWorkingDaysFromJoining = (joiningDate, month, year) => {
    if (!joiningDate) return 0;

    const today = getPKTDateParts();
    const joinParts = getPKTDateParts(joiningDate);
    if (!joinParts) return 0;

    if (
      joinParts.year > year ||
      (joinParts.year === year && joinParts.month > month)
    ) {
      return 0;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    let startDay = 1;

    if (joinParts.year === year && joinParts.month === month) {
      startDay = joinParts.day;
    }

    let endDay = daysInMonth;
    if (year === today.year && month === today.month) {
      endDay = Math.max(0, today.day - 1);
    }

    let workingDays = 0;
    for (let d = startDay; d <= endDay; d++) {
      const date = new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
      if (date.getUTCDay() !== 0) workingDays++; // 0 is Sunday
    }
    return workingDays;
  };

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get("/admin/settings/deduction", {
          withCredentials: true,
        });
        setDeductionSettings(res.data);
      } catch (err) {
        console.error("Error fetching deduction settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/admin/attendance/getall", {
        withCredentials: true,
      });

      const allRecords = res.data.attendance || [];
      const today = getPKTDateParts();

      const filteredData = allRecords.filter((record) => {
        if (!record.date) return false;

        const {
          year: recYear,
          month: recMonth,
          day: recDay,
        } = getPKTDateParts(record.date);

        if (
          recYear === today.year &&
          recMonth === today.month &&
          recDay >= today.day
        ) {
          return false;
        }

        return recMonth === selectedMonth && recYear === selectedYear;
      });

      setAttendance(filteredData);
    } catch (err) {
      setError("Failed to fetch report data.");
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  const getSummaryData = () => {
    const summary = {};
    const deductionPerAbsence = deductionSettings?.deductionPerAbsence || 0;

    employees.forEach((emp) => {
      summary[emp._id] = {
        employeeID: emp.employeeID || "Unknown",
        name: emp.EmployeeName || "Unknown",
        salary: Number(emp.EmployeeSalary || 0),
        joiningDate: emp.createdAt || null,
        present: 0,
        late: 0,
        absent: 0,
        halfDay: 0,
        totalDeduction: 0,
      };
    });

    attendance.forEach((record) => {
      const empId = record.employeeId?._id;
      if (!empId || !summary[empId]) return;

      if (summary[empId].joiningDate === null && record.employeeId?.createdAt) {
        summary[empId].joiningDate = record.employeeId.createdAt;
      }

      const status = record.status?.toLowerCase().trim() || "";
      if (status === "present") summary[empId].present++;
      else if (status === "late") summary[empId].late++;
      else if (status === "absent") summary[empId].absent++;
      else if (status.includes("half")) summary[empId].halfDay++;

      summary[empId].totalDeduction += record.deduction || 0;
    });

    Object.values(summary).forEach((emp) => {
      const workingDays = getWorkingDaysFromJoining(
        emp.joiningDate,
        selectedMonth,
        selectedYear,
      );

      const daysAccountedFor =
        emp.present + emp.late + emp.halfDay + emp.absent;
      const missingDays = Math.max(0, workingDays - daysAccountedFor);

      emp.absent += missingDays;
      emp.totalDeduction += missingDays * deductionPerAbsence;
    });

    return Object.values(summary);
  };

  const summaryData = getSummaryData().sort((a, b) =>
    (a.employeeID || "").localeCompare(b.employeeID || "", undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );

  const detailedData = selectedEmployee ? detailedAttendance : [];

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
        return "status-present";
      case "late":
        return "status-late";
      case "absent":
        return "status-absent";
      case "half-day":
      case "halfday":
        return "status-halfday";
      default:
        return "";
    }
  };

  const currentDetailedEmp =
    employees.find((e) => e._id === selectedEmployee) || {};
  const baseSalaryDetailed = Number(currentDetailedEmp.EmployeeSalary || 0);
  const totalDeductionDetailed = detailedData.reduce(
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
            emp.absent,
            `-${emp.totalDeduction.toLocaleString()}`,
            emp.salary.toLocaleString(),
            (emp.salary - emp.totalDeduction).toLocaleString(),
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
        if (detailedData.length === 0) {
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
          body: detailedData.map((r, i) => {
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
    <div className="reports-wrapper">
      <button className="reports-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>
      <div className="reports-header">
        <div>
          <h1>Reports</h1>
          <p>Monthly attendance and salary summary</p>
        </div>
      </div>

      {error && (
        <div className="reports-error">
          <span>⚠</span> {error}
        </div>
      )}

      <div className="reports-filters">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="reports-select"
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
          className="reports-select"
        >
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
        </select>
        <div className="action-buttons">
          <button
            className="btn-generate"
            onClick={fetchReport}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner"></span>
            ) : (
              "↻ Generate Report"
            )}
          </button>
          <button
            className="btn-generate btn-pdf"
            onClick={handleDownloadPDF}
            disabled={loading || detailedLoading}
          >
            📥 Download PDF
          </button>
        </div>
      </div>

      <div className="reports-tabs">
        <button
          className={`tab-btn ${activeTab === "summary" ? "active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          📊 Monthly Summary
        </button>
        <button
          className={`tab-btn ${activeTab === "detailed" ? "active" : ""}`}
          onClick={() => setActiveTab("detailed")}
        >
          📋 Detailed View
        </button>
      </div>

      <div className="reports-content-area">
        {activeTab === "summary" &&
          (loading ? (
            <div className="reports-loading">
              <div className="loading-spinner"></div>
              <p>Generating report...</p>
            </div>
          ) : summaryData.length === 0 ? (
            <div className="reports-empty">
              <span>📊</span>
              <h3>
                No data for {months[selectedMonth - 1]} {selectedYear}
              </h3>
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="reports-table-wrapper">
              <table className="reports-table" style={{ minWidth: "750px" }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Half Day</th>
                    <th>Absent</th>
                    <th>Total Deduction</th>
                    <th>Base Salary</th>
                    <th>Final Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryData.map((emp, index) => (
                    <tr key={index}>
                      <td className="td-index">{index + 1}</td>
                      <td className="td-id">{emp.employeeID}</td>
                      <td className="td-name">
                        <div className="emp-avatar">
                          {emp.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        {emp.name}
                      </td>
                      <td>
                        <span className="status-badge status-present">
                          {emp.present}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge status-late">
                          {emp.late}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge status-halfday">
                          {emp.halfDay}
                        </span>
                      </td>
                      <td>
                        <span className="status-badge status-absent">
                          {emp.absent}
                        </span>
                      </td>
                      <td className="td-deduction has-deduction">
                        -{emp.totalDeduction.toLocaleString()}
                      </td>
                      <td className="td-salary">
                        {emp.salary.toLocaleString()}
                      </td>
                      <td className="td-final-salary">
                        {(emp.salary - emp.totalDeduction).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {activeTab === "detailed" && (
          <div className="detailed-tab-content">
            <div className="detailed-filter">
              <label>Select Employee:</label>
              <div className="dropdown-container">
                <input
                  type="text"
                  className="reports-select search-input"
                  placeholder="🔍 Search Employee Name or ID..."
                  value={employeeSearchTerm}
                  onChange={(e) => {
                    setEmployeeSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                    if (e.target.value === "") setSelectedEmployee("");
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                />
                {isDropdownOpen && (
                  <ul className="dropdown-list">
                    {filteredDropdownEmployees.length > 0 ? (
                      filteredDropdownEmployees.map((emp) => (
                        <li
                          key={emp._id}
                          className="dropdown-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedEmployee(emp._id);
                            setEmployeeSearchTerm(
                              `${emp.employeeID} - ${emp.EmployeeName}`,
                            );
                            setIsDropdownOpen(false);
                          }}
                        >
                          <span className="dropdown-emp-id">
                            {emp.employeeID}
                          </span>
                          <span className="dropdown-emp-name">
                            {emp.EmployeeName}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="dropdown-empty">No employee found</li>
                    )}
                  </ul>
                )}
              </div>
            </div>

            {!selectedEmployee ? (
              <div className="reports-empty">
                <span>👤</span>
                <h3>Select an employee</h3>
                <p>
                  Search and select an employee to view their detailed
                  attendance
                </p>
              </div>
            ) : detailedLoading ? (
              <div className="reports-loading">
                <div className="loading-spinner"></div>
                <p>Generating report...</p>
              </div>
            ) : detailedData.length === 0 ? (
              <div className="reports-empty">
                <span>📋</span>
                <h3>No records found</h3>
                <p>
                  No attendance for this employee in {months[selectedMonth - 1]}{" "}
                  {selectedYear}
                </p>
              </div>
            ) : (
              <div className="reports-table-wrapper">
                <div className="detailed-summary-card">
                  <div className="summary-item">
                    <h4>Total Days</h4>
                    <p>{detailedData.length}</p>
                  </div>
                  <div className="summary-item">
                    <h4>Present</h4>
                    <p className="text-green">
                      {
                        detailedData.filter(
                          (r) => r.status?.toLowerCase() === "present",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="summary-item">
                    <h4>Late</h4>
                    <p className="text-orange">
                      {
                        detailedData.filter(
                          (r) => r.status?.toLowerCase() === "late",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="summary-item">
                    <h4>Half Day</h4>
                    <p className="text-purple">
                      {
                        detailedData.filter((r) =>
                          r.status?.toLowerCase().includes("half"),
                        ).length
                      }
                    </p>
                  </div>
                  <div className="summary-item">
                    <h4>Absent</h4>
                    <p className="text-red">
                      {
                        detailedData.filter(
                          (r) => r.status?.toLowerCase() === "absent",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="summary-item">
                    <h4>Total Deduction</h4>
                    <p className="text-red">
                      -{totalDeductionDetailed.toLocaleString()}
                    </p>
                  </div>
                  <div className="summary-item">
                    <h4>Base Salary</h4>
                    <p>Rs. {baseSalaryDetailed.toLocaleString()}</p>
                  </div>
                  <div className="summary-item">
                    <h4>Final Salary</h4>
                    <p className="text-green">
                      Rs. {finalSalaryDetailed.toLocaleString()}
                    </p>
                  </div>
                </div>

                <table className="reports-table">
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
                    {detailedData.map((record, index) => (
                      <tr key={record._id || `virtual-${record.date}-${index}`}>
                        <td className="td-index">{index + 1}</td>
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
                            className={`status-badge ${getStatusClass(record.status)}`}
                          >
                            {record.status}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewReports;
