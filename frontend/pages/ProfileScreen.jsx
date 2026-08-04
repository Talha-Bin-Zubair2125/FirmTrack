import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import "../stylings/ProfileScreen.css";
import API from "../src/api/axios";

function ProfileScreen() {

  const { adminInfo, setAdminInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [lateToday, setLateToday] = useState(0);
  const [halfDayToday, setHalfDayToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  const fetchDashboardStats = useCallback(async () => {
    try {
      const empRes = await API.get("/admin/employees/getallemployees", {
        withCredentials: true,
      });
      const allEmployees = empRes.data.employees || [];
      const total = allEmployees.length;
      setTotalEmployees(total);
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
      console.log("Today's attendance records:", todayRecords);
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
          <div>
            <h1>Dashboard</h1>
            <p>
              Welcome back, <span>{adminInfo?.adminID || "Admin"}</span>
            </p>
          </div>
          <div className="topbar-actions">
            <div className="profile-avatar">
              {adminInfo?.adminID?.charAt(0) || "A"}
            </div>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <div className="profile-stats">
          <div className="stat-card" onClick={() => navigate("/viewemployees")}>
            <div className="stat-icon" style={{ background: "#eff6ff" }}>
              👥
            </div>
            <div>
              <h3>Total Employees</h3>
              <p>{totalEmployees}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon" style={{ background: "#f0fdf4" }}>
              ✅
            </div>
            <div>
              <h3>Present Today</h3>
              <p>{presentToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon" style={{ background: "#fff7ed" }}>
              ⏰
            </div>
            <div>
              <h3>Late Today</h3>
              <p>{lateToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon" style={{ background: "#f3e8ff" }}>
              🌗
            </div>
            <div>
              <h3>Half Day</h3>
              <p>{halfDayToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")}>
            <div className="stat-icon" style={{ background: "#fff1f2" }}>
              ❌
            </div>
            <div>
              <h3>Absent Today</h3>
              <p>{absentToday}</p>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button
              className="action-card"
              onClick={() => navigate("/viewemployees")}
            >
              <span>👥</span>
              <p>View Employees</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/addemployee")}
            >
              <span>👤</span>
              <p>Add Employee</p>
            </button>
            <button className="action-card" onClick={() => navigate("/qr")}>
              <span>⊡</span>
              <p>Generate QR</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/attendance")}
            >
              <span>📋</span>
              <p>View Attendance</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/reports")}
            >
              <span>📊</span>
              <p>Generate Report</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/updateprofile")}
            >
              <span>👤</span>
              <p>Update Profile</p>
            </button>
            <button
              className="action-card"
              onClick={() => navigate("/deductionsettings")}
            >
              <span>💰</span>
              <p>Deduction Rules</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
export default ProfileScreen;
