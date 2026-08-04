import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import "../stylings/ProfileScreen.css";
import API from "../src/api/axios";

function ProfileScreen() {
  
  const { adminInfo, setAdminInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [employeeRecords, setemployeeRecords] = useState([]);
  const [previousDayRecords, setPreviousDayRecords] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [lateToday, setLateToday] = useState(0);
  const [halfDayToday, setHalfDayToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [prevPresent, setPrevPresent] = useState(0);
  const [prevLate, setPrevLate] = useState(0);
  const [prevHalfDay, setPrevHalfDay] = useState(0);
  const [prevAbsent, setPrevAbsent] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const fetchDashboardStats = useCallback(async () => {
    try {
      const empRes = await API.get("/admin/employees/getallemployees", {
        withCredentials: true,
      });
      setemployeeRecords(empRes.data.employees);
      const allEmployees = empRes.data.employees || [];
      setTotalEmployees(allEmployees.length);
      const attRes = await API.get("/admin/attendance/getall", {
        withCredentials: true,
      });
      const allAttendance = attRes.data.attendance || [];
      const now = new Date();
      const pktOffset = 5 * 60;
      const pktNow = new Date(now.getTime() + pktOffset * 60000);
      const todayStr = pktNow.toISOString().split("T")[0];

      const todayRecords = allAttendance.filter((record) => {
        if (!record.date) return false;
        const recDate = new Date(record.date);
        const recPKT = new Date(recDate.getTime() + pktOffset * 60000);
        return recPKT.toISOString().split("T")[0] === todayStr;
      });

      let present = 0,
        late = 0,
        halfDay = 0,
        absent = 0;
      todayRecords.forEach((record) => {
        const status = record.status?.toLowerCase().trim() || "";
        if (status === "present") present++;
        else if (status === "late") late++;
        else if (status.includes("half")) halfDay++;
        else if (status === "absent") absent++;
      });

      const previousDayRecordsList = allAttendance
        .filter((record) => {
          if (!record.date) return false;
          const recDate = new Date(record.date);
          const recPKT = new Date(recDate.getTime() + pktOffset * 60000);
          return recPKT.toISOString().split("T")[0] < todayStr;
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      setPreviousDayRecords(previousDayRecordsList);

      let pPres = 0,
        pLate = 0,
        pHalf = 0,
        pAbs = 0;
      previousDayRecordsList.forEach((record) => {
        const status = record.status?.toLowerCase().trim() || "";
        if (status === "present") pPres++;
        else if (status === "late") pLate++;
        else if (status.includes("half")) pHalf++;
        else if (status === "absent") pAbs++;
      });

      setPrevPresent(pPres);
      setPrevLate(pLate);
      setPrevHalfDay(pHalf);
      setPrevAbsent(pAbs);
      setPresentToday(present);
      setLateToday(late);
      setHalfDayToday(halfDay);
      setAbsentToday(absent);
      setToastMessage("Data fetched successfully!");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setToastMessage("Error fetching data!");
      setTimeout(() => setToastMessage(""), 3000);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleLogout = async () => {
    try {
      await API.post("/auth/admin/logout", {}, { withCredentials: true });
      setAdminInfo(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="profile-wrapper">
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}
      <main className="profile-main">
        <div className="profile-topbar">
          <div className="topbar-welcome">
            <h1>Dashboard Overview</h1>
            <p>
              Welcome back, <span>{adminInfo?.adminID || "Admin"}</span>
            </p>
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

        <div className="profile-stats">
          <div className="stat-card" onClick={() => navigate("/viewemployees")}>
            <div className="stat-icon employees">👥</div>
            <div className="stat-info">
              <h3>Total Employees</h3>
              <p>{totalEmployees}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon present">✅</div>
            <div className="stat-info">
              <h3>Present Today</h3>
              <p>{presentToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon late">⏰</div>
            <div className="stat-info">
              <h3>Late Today</h3>
              <p>{lateToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon halfday">🌗</div>
            <div className="stat-info">
              <h3>Half Day</h3>
              <p>{halfDayToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon absent">❌</div>
            <div className="stat-info">
              <h3>Absent Today</h3>
              <p>{absentToday}</p>
            </div>
          </div>
        </div>

        <div className="prev-day-banner">
          <div className="prev-day-header">
            <h3>Previous Day Attendance Summary</h3>
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
          </div>
        </div>

        <div className="profile-actions-section">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button
              className="action-card"
              onClick={() => navigate("/viewemployees")}
            >
              <span className="action-emoji">👥</span>
              <p>View Employees</p>
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
              <p>View Attendance</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/reports")}
            >
              <span className="action-emoji">📊</span>
              <p>Generate Report</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/updateprofile")}
            >
              <span className="action-emoji">⚙️</span>
              <p>Update Profile</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/deductionsettings")}
            >
              <span className="action-emoji">💰</span>
              <p>Deduction Rules</p>
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
                        <span className="emp-id-badge">{emp.employeeID}</span>
                      </td>
                      <td className="emp-name">{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>
                        <span className="role-badge">{emp.role}</span>
                      </td>
                      <td>{new Date(emp.joiningDate).toLocaleDateString()}</td>
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
