import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../stylings/Reports.css";

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

  // 🔧 FIX: Detailed View ke liye alag se state — ye backend ke
  // /report/bymonth route se aata hai jo virtual "absent" rows
  // (jaise FirmTrack app dikhata hai) bhi include karta hai.
  const [detailedAttendance, setDetailedAttendance] = useState([]);
  const [detailedLoading, setDetailedLoading] = useState(false);

  // 🔥 NAYI STATES: Searchable Dropdown ke liye
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // 🔧 FIX: PKT ke hisaab se "aaj ki date" nikalne wala helper, taake
  // joining date aur "today" dono same timezone basis pe compare hon.
  const getPKTDateParts = () => {
    const now = new Date();
    const pktNow = new Date(now.getTime() + 5 * 60 * 60 * 1000);
    return {
      year: pktNow.getUTCFullYear(),
      month: pktNow.getUTCMonth() + 1,
      day: pktNow.getUTCDate(),
    };
  };

  // 🔧 FIX: joiningDate ko bhi PKT/UTC-consistent tareeqe se parse kar rahe hain
  // (pehle local timezone se parse ho raha tha jabke "today" PKT offset se nikalti thi,
  // is wajah se UTC-midnight wali dates kabhi kabhi 1 din peechay chali jati thin).
  const getJoiningDateParts = (joiningDate) => {
    if (!joiningDate) return null;
    const joining = new Date(joiningDate);
    const pktJoining = new Date(joining.getTime() + 5 * 60 * 60 * 1000);
    return {
      year: pktJoining.getUTCFullYear(),
      month: pktJoining.getUTCMonth() + 1,
      day: pktJoining.getUTCDate(),
    };
  };

  const getWorkingDaysFromJoining = (joiningDate, month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    let startDay = 1;

    const { year: todayYear, month: todayMonth, day: todayDay } = getPKTDateParts();

    const joinParts = getJoiningDateParts(joiningDate);
    if (joinParts) {
      const { year: joinYear, month: joinMonth, day: joinDay } = joinParts;

      if (joinYear > year || (joinYear === year && joinMonth > month)) return 0;
      if (joinYear === year && joinMonth === month) startDay = joinDay;
    }

    let endDay = daysInMonth;
    if (year === todayYear && month === todayMonth) {
      // 🔧 FIX: aaj ka din sirf tab tak ginna chahiye jab tak wo guzar na jaye,
      // warna current din premature "absent" ban jata tha report generate hotay hi.
      endDay = Math.max(0, todayDay - 1);
    }

    let workingDays = 0;
    for (let d = startDay; d <= endDay; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0) workingDays++; // Sunday off, Saturday working day (as confirmed)
    }
    return workingDays;
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get(
          "http://localhost:3000/api/admin/employees/getallemployees",
          { withCredentials: true }
        );
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
        const res = await axios.get(
          "http://localhost:3000/api/admin/settings/deduction",
          { withCredentials: true }
        );
        setDeductionSettings(res.data);
      } catch (err) {
        console.error("Error fetching deduction settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        "http://localhost:3000/api/admin/attendance/getall",
        { withCredentials: true }
      );

      const allRecords = res.data.attendance || [];
      const pktOffset = 5 * 60;

      const filteredData = allRecords.filter((record) => {
        if (!record.date) return false;
        const recDate = new Date(record.date);
        const recPKT = new Date(recDate.getTime() + pktOffset * 60000);
        return (
          recPKT.getMonth() + 1 === selectedMonth &&
          recPKT.getFullYear() === selectedYear
        );
      });

      setAttendance(filteredData);
    } catch (err) {
      setError("Failed to fetch report data.");
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  // 🔧 FIX: Detailed View ab is route se data leta hai jo backend mein
  // pehle se maujood hai (controller: getAttendanceByMonth). Ye route
  // virtual "absent" rows generate karta hai un dino ke liye jin ka
  // koi record DB mein nahi — isi liye FirmTrack app mein 20 June ka
  // absent dikh raha tha lekin web ki Detailed View mein nahi.
  const fetchDetailedReport = async (employeeId) => {
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
      const res = await axios.get(
        "http://localhost:3000/api/admin/report/bymonth",
        {
          params: {
            month: selectedMonth,
            year: selectedYear,
            employeeID: emp.employeeID,
          },
          withCredentials: true,
        }
      );
      setDetailedAttendance(res.data.attendance || []);
    } catch (err) {
      console.error("Error fetching detailed report:", err);
      setDetailedAttendance([]);
    } finally {
      setDetailedLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "detailed" && selectedEmployee) {
      fetchDetailedReport(selectedEmployee);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, selectedMonth, selectedYear, activeTab]);

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
        selectedYear
      );
      const daysAccountedFor = emp.present + emp.late + emp.halfDay + emp.absent;
      const missingDays = Math.max(0, workingDays - daysAccountedFor);
      emp.absent += missingDays;
      emp.totalDeduction += missingDays * deductionPerAbsence;
    });

    return Object.values(summary);
  };

  const getDetailedData = () => {
    if (!selectedEmployee) return [];
    // 🔧 FIX: ab detailedAttendance se aata hai (backend ke virtual
    // absent rows samet), na ke sirf getAllAttendance wale real records se.
    return detailedAttendance;
  };

  // 🔥 UPDATE: Yahan par data ko Employee ID ke hisaab se sort kar diya gaya hai
  const summaryData = getSummaryData().sort((a, b) => 
    (a.employeeID || "").localeCompare(b.employeeID || "", undefined, { numeric: true, sensitivity: 'base' })
  );
  
  const detailedData = getDetailedData();

  // 🔥 FILTER: Custom Dropdown ki suggestions ke liye
  const filteredDropdownEmployees = employees.filter(emp =>
    (emp.EmployeeName?.toLowerCase() || "").includes(employeeSearchTerm.toLowerCase()) ||
    (emp.employeeID?.toLowerCase() || "").includes(employeeSearchTerm.toLowerCase())
  );

  const getStatusClass = (status) => {
    const s = status?.toLowerCase().trim() || "";
    switch (s) {
      case "present": return "status-present";
      case "late": return "status-late";
      case "absent": return "status-absent";
      case "half-day":
      case "halfday": return "status-halfday";
      default: return "";
    }
  };

  const currentDetailedEmp = employees.find(e => e._id === selectedEmployee) || {};
  const baseSalaryDetailed = Number(currentDetailedEmp.EmployeeSalary || 0);
  const totalDeductionDetailed = detailedData.reduce((sum, r) => sum + (r.deduction || 0), 0);
  const finalSalaryDetailed = baseSalaryDetailed - totalDeductionDetailed;

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const monthName = months[selectedMonth - 1];

      if (activeTab === "summary") {
        if (summaryData.length === 0) { alert("No data to print!"); return; }
        doc.setFontSize(16);
        doc.text("AttendX - Monthly Summary Report", 14, 15);
        doc.setFontSize(12);
        doc.text(`Month: ${monthName} ${selectedYear}`, 14, 22);
        autoTable(doc, {
          head: [["#", "Emp ID", "Name", "Present", "Late", "Half Day", "Absent", "Deduction", "Base Salary", "Final Salary"]],
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
            (emp.salary - emp.totalDeduction).toLocaleString()
          ]),
          startY: 28,
          theme: "grid",
          headStyles: { fillColor: [26, 26, 46] },
        });
        doc.save(`Summary_${monthName}_${selectedYear}.pdf`);
      } else {
        if (!selectedEmployee) { alert("Select an employee first!"); return; }
        if (detailedData.length === 0) { alert("No records found!"); return; }
        const empName = currentDetailedEmp.EmployeeName || "Employee";
        const empIdText = currentDetailedEmp.employeeID || "";
        doc.setFontSize(16);
        doc.text("AttendX - Detailed Attendance Report", 14, 15);
        doc.setFontSize(11);
        doc.text(`Employee: ${empName} (${empIdText})`, 14, 23);
        doc.text(`Month: ${monthName} ${selectedYear}`, 14, 29);
        doc.text(`Base Salary: PKR ${baseSalaryDetailed.toLocaleString()}`, 120, 23);
        doc.text(`Final Salary: PKR ${finalSalaryDetailed.toLocaleString()}`, 120, 29);
        autoTable(doc, {
          head: [["#", "Date", "Check In Time", "Status", "Deduction (PKR)"]],
          body: detailedData.map((r, i) => [
            i + 1,
            r.date
              ? new Date(r.date).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" })
              : "N/A",
            r.checkInTime
              ? new Date(r.checkInTime).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
              : "N/A",
            r.status || "N/A",
            r.deduction > 0 ? `-${r.deduction.toLocaleString()}` : "0"
          ]),
          startY: 36,
          theme: "grid",
          headStyles: { fillColor: [26, 26, 46] },
        });
        doc.save(`Detailed_${empName.replace(/\s+/g, "_")}_${monthName}_${selectedYear}.pdf`);
      }
    } catch (err) {
      console.error("PDF error:", err);
      alert("PDF generation failed.");
    }
  };

  return (
    <div className="reports-wrapper">
      <button className="reports-back" onClick={() => navigate("/profile")}>← Back to Dashboard</button>
      <div className="reports-header">
        <div>
          <h1>Reports</h1>
          <p>Monthly attendance and salary summary</p>
        </div>
      </div>
      {error && <div className="reports-error"><span>⚠</span> {error}</div>}

      <div className="reports-filters">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="reports-select"
        >
          {months.map((month, index) => (
            <option key={index} value={index + 1}>{month}</option>
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
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn-generate" onClick={fetchReport} disabled={loading}>
            {loading ? <span className="btn-spinner"></span> : "↻ Generate Report"}
          </button>
          <button className="btn-generate btn-pdf" onClick={handleDownloadPDF} disabled={loading || detailedLoading}>
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

      {activeTab === "summary" && (
        loading ? (
          <div className="reports-loading">
            <div className="loading-spinner"></div>
            <p>Generating report...</p>
          </div>
        ) : summaryData.length === 0 ? (
          <div className="reports-empty">
            <span>📊</span>
            <h3>No data for {months[selectedMonth - 1]} {selectedYear}</h3>
            <p>No attendance records found</p>
          </div>
        ) : (
          <div className="reports-table-wrapper">
            <table className="reports-table">
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
                      <div className="emp-avatar">{emp.name?.charAt(0).toUpperCase() || "?"}</div>
                      {emp.name}
                    </td>
                    <td><span className="status-badge status-present">{emp.present}</span></td>
                    <td><span className="status-badge status-late">{emp.late}</span></td>
                    <td><span className="status-badge status-halfday">{emp.halfDay}</span></td>
                    <td><span className="status-badge status-absent">{emp.absent}</span></td>
                    <td className="td-deduction has-deduction">-{emp.totalDeduction.toLocaleString()}</td>
                    <td className="td-salary">{emp.salary.toLocaleString()}</td>
                    <td className="td-final-salary">{(emp.salary - emp.totalDeduction).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {activeTab === "detailed" && (
        <div>
          <div className="detailed-filter">
            <label>Select Employee:</label>
            
            <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
              <input
                type="text"
                className="reports-select"
                placeholder="🔍 Search Employee Name or ID..."
                value={employeeSearchTerm}
                onChange={(e) => {
                  setEmployeeSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                  if (e.target.value === "") setSelectedEmployee("");
                }}
                onFocus={() => setIsDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                style={{ width: "100%", boxSizing: "border-box" }}
              />

              {isDropdownOpen && (
                <ul style={{
                  position: "absolute", top: "100%", left: 0, right: 0,
                  backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
                  maxHeight: "250px", overflowY: "auto", zIndex: 1000, margin: "4px 0 0 0",
                  padding: 0, listStyle: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
                }}>
                  {filteredDropdownEmployees.length > 0 ? (
                    filteredDropdownEmployees.map((emp) => (
                      <li
                        key={emp._id}
                        onClick={() => {
                          setSelectedEmployee(emp._id);
                          setEmployeeSearchTerm(`${emp.employeeID} - ${emp.EmployeeName}`);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          padding: "12px 15px", cursor: "pointer", borderBottom: "1px solid #f3f4f6",
                          display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <span style={{ fontWeight: "600", color: "#1a1a2e" }}>{emp.employeeID}</span>
                        <span style={{ color: "#4b5563" }}>{emp.EmployeeName}</span>
                      </li>
                    ))
                  ) : (
                    <li style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
                      No employee found
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {!selectedEmployee ? (
            <div className="reports-empty">
              <span>👤</span>
              <h3>Select an employee</h3>
              <p>Search and select an employee to view their detailed attendance</p>
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
              <p>No attendance for this employee in {months[selectedMonth - 1]} {selectedYear}</p>
            </div>
          ) : (
            <div className="reports-table-wrapper">
              <div className="detailed-summary-card">
                <div className="summary-item"><h4>Total Days</h4><p>{detailedData.length}</p></div>
                <div className="summary-item">
                  <h4>Present</h4>
                  <p className="text-green">{detailedData.filter(r => r.status?.toLowerCase() === "present").length}</p>
                </div>
                <div className="summary-item">
                  <h4>Late</h4>
                  <p className="text-orange">{detailedData.filter(r => r.status?.toLowerCase() === "late").length}</p>
                </div>
                <div className="summary-item">
                  <h4>Half Day</h4>
                  <p className="text-purple">{detailedData.filter(r => r.status?.toLowerCase().includes("half")).length}</p>
                </div>
                <div className="summary-item">
                  <h4>Absent</h4>
                  <p className="text-red">{detailedData.filter(r => r.status?.toLowerCase() === "absent").length}</p>
                </div>
                <div className="summary-item">
                  <h4>Total Deduction</h4>
                  <p className="text-red">-{totalDeductionDetailed.toLocaleString()}</p>
                </div>
                <div className="summary-item">
                  <h4>Base Salary</h4>
                  <p>Rs. {baseSalaryDetailed.toLocaleString()}</p>
                </div>
                <div className="summary-item">
                  <h4>Final Salary</h4>
                  <p className="text-green">Rs. {finalSalaryDetailed.toLocaleString()}</p>
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
                          ? new Date(record.date).toLocaleDateString("en-PK", {
                              weekday: "short", day: "numeric", month: "short"
                            })
                          : "N/A"}
                      </td>
                      <td>
                        {record.checkInTime
                          ? new Date(record.checkInTime).toLocaleTimeString("en-PK", {
                              hour: "2-digit", minute: "2-digit"
                            })
                          : "N/A"}
                      </td>
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
      )}
    </div>
  );
}

export default ViewReports;