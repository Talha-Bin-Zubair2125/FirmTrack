import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import "../stylings/ProfileScreen.css";
import API from "../src/api/axios";

function ProfileScreen() {
  const { adminInfo, setAdminInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [employeeRecords, setemployeeRecords] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [lateToday, setLateToday] = useState(0);
  const [halfDayToday, setHalfDayToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [leaveToday, setLeaveToday] = useState(0);
  const [prevPresent, setPrevPresent] = useState(0);
  const [prevLate, setPrevLate] = useState(0);
  const [prevHalfDay, setPrevHalfDay] = useState(0);
  const [prevAbsent, setPrevAbsent] = useState(0);
  const [prevLeave, setPrevLeave] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef(null);

  const showToast = (message) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchDashboardStats = useCallback(async () => {
    try {
      const empRes = await API.get("/admin/employees/getallemployees", {
        withCredentials: true,
      });
      const allEmployees = empRes.data.employees || [];
      setemployeeRecords(allEmployees);
      setTotalEmployees(allEmployees.length);

      const attRes = await API.get("/admin/attendance/getall", {
        withCredentials: true,
      });
      const allAttendance = attRes.data.attendance || [];

      const getPKTDateString = (dateObj) => {
        return dateObj.toLocaleDateString("en-CA", {
          timeZone: "Asia/Karachi",
        });
      };

      const now = new Date();
      const todayStr = getPKTDateString(now);
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = getPKTDateString(prevDate);

      let present = 0,
        late = 0,
        halfDay = 0,
        absent = 0,
        leave = 0;
      let pPres = 0,
        pLate = 0,
        pHalf = 0,
        pAbs = 0,
        pLeave = 0;

      allAttendance.forEach((record) => {
        if (!record.date) return;
        const recDateStr = getPKTDateString(new Date(record.date));
        const status = record.status?.toLowerCase().trim() || "";

        if (recDateStr === todayStr) {
          if (status === "present") present++;
          else if (status === "late") late++;
          else if (status.includes("half")) halfDay++;
          else if (status === "absent") absent++;
          else if (status === "leave") leave++;
        } else if (recDateStr === prevDateStr) {
          if (status === "present") pPres++;
          else if (status === "late") pLate++;
          else if (status.includes("half")) pHalf++;
          else if (status === "absent") pAbs++;
          else if (status === "leave") pLeave++;
        }
      });

      setPresentToday(present);
      setLateToday(late);
      setHalfDayToday(halfDay);
      setAbsentToday(absent);
      setLeaveToday(leave);
      setPrevPresent(pPres);
      setPrevLate(pLate);
      setPrevHalfDay(pHalf);
      setPrevAbsent(pAbs);
      setPrevLeave(pLeave);
      showToast("Data fetched successfully!");
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      showToast("Error fetching data!");
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [fetchDashboardStats]);

  const handleLogout = async () => {
    try {
      await API.post("/auth/admin/logout", {}, { withCredentials: true });
      setAdminInfo(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Error logging out.");
    }
  };

  return (
    <div className="profile-wrapper">
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
      <div className="profile-topbar">
        <div className="topbar-welcome">
          <div className="topbar-brand">
            <span className="brand-logo">N</span>
            <h2>NutroAttend</h2>
          </div>
          <div className="welcome-text">
            <h1>Dashboard</h1>
            <p>
              Welcome back, <span>{adminInfo?.adminID || "Admin"}</span>
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="profile-avatar">
            {adminInfo?.adminID?.charAt(0).toUpperCase() || "A"}
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      <main className="profile-main">
        <div className="dashboard-section">
          <h2 className="section-title">Today's Overview</h2>
          <div className="profile-stats">
            <div
              className="stat-card"
              onClick={() => navigate("/viewemployees")}
            >
              <div className="stat-icon employees">👥</div>
              <div className="stat-info">
                <h3>Total Employees</h3>
                <p>{totalEmployees}</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/presentemployees")}>
              <div className="stat-icon present">✅</div>
              <div className="stat-info">
                <h3>Present Today</h3>
                <p>{presentToday}</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/lateemployees")}>
              <div className="stat-icon late">⏰</div>
              <div className="stat-info">
                <h3>Late Today</h3>
                <p>{lateToday}</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/half-day-employees")}>
              <div className="stat-icon halfday">🌗</div>
              <div className="stat-info">
                <h3>Half Day</h3>
                <p>{halfDayToday}</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/absentemployees")}>
              <div className="stat-icon absent">❌</div>
              <div className="stat-info">
                <h3>Absent</h3>
                <p>{absentToday}</p>
              </div>
            </div>
            <div className="stat-card" onClick={() => navigate("/onleaveemployees")}>
              <div className="stat-icon leave">✈️</div>
              <div className="stat-info">
                <h3>On Leave</h3>
                <p>{leaveToday}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="prev-day-banner">
          <div className="prev-day-header">
            <h3>Previous Day Summary</h3>
          </div>
          <div className="prev-day-stats">
            <span className="prev-badge present">
              Present: <strong>{prevPresent}</strong>
            </span>
            <span className="prev-badge late">
              Late: <strong>{prevLate}</strong>
            </span>
            <span className="prev-badge halfday">
              Half Day: <strong>{prevHalfDay}</strong>
            </span>
            <span className="prev-badge absent">
              Absent: <strong>{prevAbsent}</strong>
            </span>
            <span className="prev-badge leave">
              Leave: <strong>{prevLeave}</strong>
            </span>
          </div>
        </div>
        <div className="dashboard-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="actions-grid">
            <button
              className="action-card"
              onClick={() => navigate("/viewemployees")}
            >
              <span className="action-emoji">👥</span>
              <p>Employees</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/addemployee")}
            >
              <span className="action-emoji">👤</span>
              <p>Add Employee</p>
            </button>
            <button className="action-card" onClick={() => navigate("/qr")}>
              <span className="action-emoji">⊡</span>
              <p>Generate QR</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/attendance")}
            >
              <span className="action-emoji">📋</span>
              <p>Attendance</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/reports")}
            >
              <span className="action-emoji">📊</span>
              <p>Reports</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/updateprofile")}
            >
              <span className="action-emoji">⚙️</span>
              <p>Settings</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/deductionsettings")}
            >
              <span className="action-emoji">💰</span>
              <p>Deductions</p>
            </button>
          </div>
        </div>
        <div className="employee-records-section">
          <div className="section-header">
            <h2>Employee Directory</h2>
          </div>
          {employeeRecords.length > 0 ? (
            <div className="table-responsive">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Designation</th>
                    <th>Joining Date</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeRecords.map((emp) => (
                    <tr key={emp._id}>
                      <td>
                        <span className="emp-id-badge">{emp?.employeeID}</span>
                      </td>
                      <td className="emp-name">{emp?.EmployeeName}</td>
                      <td>{emp?.EmployeeEmail}</td>
                      <td>
                        <span className="role-badge">{emp?.EmployeeRole}</span>
                      </td>
                      <td>{new Date(emp?.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">No employee records found.</div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ProfileScreen;
