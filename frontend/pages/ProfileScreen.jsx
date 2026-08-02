import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../stylings/ProfileScreen.css";
import API from "../src/api/axios";

function ProfileScreen() {
  const { adminInfo, setAdminInfo } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [lateToday, setLateToday] = useState(0);
  const [halfDayToday, setHalfDayToday] = useState(0); 
  const [absentToday, setAbsentToday] = useState(0);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
     
      const empRes = await API.get(
        "/admin/employees/getallemployees",
        { withCredentials: true }
      );
      const allEmployees = empRes.data.employees || [];
      const total = allEmployees.length;
      setTotalEmployees(total);

  
      const attRes = await API.get(
        "/api/admin/attendance/getall",
        { withCredentials: true }
      );
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

      let present = 0, late = 0, halfDay = 0, absent = 0;

      todayRecords.forEach(record => {
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

    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post(
        "/auth/admin/logout",
        {},
        { withCredentials: true }
      );
      setAdminInfo(null);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="profile-wrapper">
      <aside className="profile-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">A</div>
          <span>AttendX</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${isActive("/profile") ? "active" : ""}`}
            onClick={() => navigate("/profile")}
          >
            <span className="sidebar-icon">⊞</span> Dashboard
          </button>

          <button
            className={`sidebar-link ${isActive("/viewemployees") || isActive("/addemployee") ? "active" : ""}`}
            onClick={() => navigate("/viewemployees")}
          >
            <span className="sidebar-icon">👥</span> Employees
          </button>
          <div className="sidebar-sub">
            <button
              className={`sidebar-sublink ${isActive("/viewemployees") ? "active" : ""}`}
              onClick={() => navigate("/viewemployees")}
            >
              View All
            </button>
            <button
              className={`sidebar-sublink ${isActive("/addemployee") ? "active" : ""}`}
              onClick={() => navigate("/addemployee")}
            >
              Add New
            </button>
          </div>

          <button
            className={`sidebar-link ${isActive("/qr") ? "active" : ""}`}
            onClick={() => navigate("/qr")}
          >
            <span className="sidebar-icon">⊡</span> QR Code
          </button>

          <button
            className={`sidebar-link ${isActive("/attendance") ? "active" : ""}`}
            onClick={() => navigate("/attendance")}
          >
            <span className="sidebar-icon">📋</span> Attendance
          </button>

          <button
            className={`sidebar-link ${isActive("/reports") ? "active" : ""}`}
            onClick={() => navigate("/reports")}
          >
            <span className="sidebar-icon">📊</span> Reports
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`sidebar-link ${isActive("/updateprofile") || isActive("/deductionsettings") ? "active" : ""}`}
            onClick={() => navigate("/updateprofile")}
          >
            <span className="sidebar-icon">⚙</span> Settings
          </button>
          <div className="sidebar-sub">
            <button
              className={`sidebar-sublink ${isActive("/updateprofile") ? "active" : ""}`}
              onClick={() => navigate("/updateprofile")}
            >
              Update Profile
            </button>
            <button
              className={`sidebar-sublink ${isActive("/deductionsettings") ? "active" : ""}`}
              onClick={() => navigate("/deductionsettings")}
            >
              Deduction Rules
            </button>
          </div>

          <button className="sidebar-logout" onClick={handleLogout}>
            <span className="sidebar-icon">→</span> Logout
          </button>
        </div>
      </aside>

      <main className="profile-main">
        <div className="profile-topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back, <span>{adminInfo?.adminID || "Admin"}</span></p>
          </div>
          <div className="profile-avatar">
            {adminInfo?.adminID?.charAt(0) || "A"}
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat-card" onClick={() => navigate("/viewemployees")} style={{ cursor: "pointer" }}>
            <div className="stat-icon" style={{ background: "#eff6ff" }}>👥</div>
            <div>
              <h3>Total Employees</h3>
              <p>{totalEmployees}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")} style={{ cursor: "pointer" }}>
            <div className="stat-icon" style={{ background: "#f0fdf4" }}>✅</div>
            <div>
              <h3>Present Today</h3>
              <p>{presentToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")} style={{ cursor: "pointer" }}>
            <div className="stat-icon" style={{ background: "#fff7ed" }}>⏰</div>
            <div>
              <h3>Late Today</h3>
              <p>{lateToday}</p>
            </div>
          </div>
          {/* 🔥 Naya Card: Half Day ke liye */}
          <div className="stat-card" onClick={() => navigate("/attendance")} style={{ cursor: "pointer" }}>
            <div className="stat-icon" style={{ background: "#f3e8ff" }}>🌗</div>
            <div>
              <h3>Half Day</h3>
              <p>{halfDayToday}</p>
            </div>
          </div>
          <div className="stat-card" onClick={() => navigate("/attendance")} style={{ cursor: "pointer" }}>
            <div className="stat-icon" style={{ background: "#fff1f2" }}>❌</div>
            <div>
              <h3>Absent Today</h3>
              <p>{absentToday}</p>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <h2>Quick Actions</h2>
          <div className="actions-grid">
            <button className="action-card" onClick={() => navigate("/viewemployees")}>
              <span>👥</span>
              <p>View Employees</p>
            </button>
            <button className="action-card" onClick={() => navigate("/addemployee")}>
              <span>👤</span>
              <p>Add Employee</p>
            </button>
            <button className="action-card" onClick={() => navigate("/qr")}>
              <span>⊡</span>
              <p>Generate QR</p>
            </button>
            <button className="action-card" onClick={() => navigate("/attendance")}>
              <span>📋</span>
              <p>View Attendance</p>
            </button>
            <button className="action-card" onClick={() => navigate("/reports")}>
              <span>📊</span>
              <p>Generate Report</p>
            </button>
            <button className="action-card" onClick={() => navigate("/updateprofile")}>
              <span>👤</span>
              <p>Update Profile</p>
            </button>
            <button className="action-card" onClick={() => navigate("/deductionsettings")}>
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