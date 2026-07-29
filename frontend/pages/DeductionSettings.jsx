import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/DeductionSettings.css";

function DeductionSettings() {
  const navigate = useNavigate();
  const [lateArrivalTime, setLateArrivalTime] = useState("09:00");
  const [allowedTotalLeave, setAllowedTotalLeave] = useState(2);
  const [allowedHalfDayTime, setAllowedHalfDayTime] = useState("13:00");
  const [deductionPerLate, setDeductionPerLate] = useState(0);
  const [deductionPerHalfDay, setDeductionPerHalfDay] = useState(0);
  const [deductionPerAbsence, setDeductionPerAbsence] = useState(0);
  const [exceedsTotalLeaveDeduction, setExceedsTotalLeaveDeduction] = useState(0);
  const [exceedsHalfDayDeduction, setExceedsHalfDayDeduction] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSettings, setHasSettings] = useState(false); // track if settings exist

  // fetch current settings on mount
  useEffect(() => {
    fetchDeductionSettings();
  }, []);

  const fetchDeductionSettings = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3000/api/admin/settings/deduction",
        { withCredentials: true }
      );
      const settings = response.data;
      if (settings) {
        setLateArrivalTime(settings.lateArrivalTime || "09:00");
        setAllowedTotalLeave(settings.allowedTotalLeave || 2);
        setAllowedHalfDayTime(settings.allowedHalfDayTime || "13:00");
        setDeductionPerLate(settings.deductionPerLate || 0);
        setDeductionPerHalfDay(settings.deductionPerHalfDay || 0);
        setDeductionPerAbsence(settings.deductionPerAbsence || 0);
        setExceedsTotalLeaveDeduction(settings.exceedsTotalLeaveDeduction || 0);
        setExceedsHalfDayDeduction(settings.exceedsHalfDayDeduction || 0);
        setHasSettings(true); // settings exist → show update button
      }
    } catch (error) {
      console.error("Error fetching deduction settings:", error);
      setHasSettings(false); // no settings yet → show add button
    }
  };

  const getFormData = () => ({
    lateArrivalTime,
    allowedTotalLeave,
    allowedHalfDayTime,
    deductionPerLate,
    deductionPerHalfDay,
    deductionPerAbsence,
    exceedsTotalLeaveDeduction,
    exceedsHalfDayDeduction,
  });

  // add settings (first time)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3000/api/admin/add/deduction",
        getFormData(),
        { withCredentials: true }
      );
      setSuccess("Deduction settings saved successfully!");
      setHasSettings(true);
      console.log("Settings added:", response.data);
    } catch (error) {
      setError(error.response?.data?.message || "Error saving settings");
      console.error("Error adding deduction settings:", error);
    } finally {
      setLoading(false);
    }
  };

  // update existing settings
  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const response = await axios.put(
        "http://localhost:3000/api/admin/update/deduction",
        getFormData(),
        { withCredentials: true }
      );
      setSuccess("Deduction settings updated successfully!");
      console.log("Settings updated:", response.data);
    } catch (error) {
      setError(error.response?.data?.message || "Error updating settings");
      console.error("Error updating deduction settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deduction-wrapper">

      {/* ── Back Button ── */}
      <button className="deduction-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>

      {/* ── Header ── */}
      <div className="deduction-header">
        <h1>Deduction Settings</h1>
        <p>Configure attendance rules and salary deductions</p>
      </div>

      {/* ── Notifications ── */}
      {error && (
        <div className="deduction-notification error" onClick={() => setError("")}>
          <span>⚠</span> {error}
          <button className="notif-close">✕</button>
        </div>
      )}
      {success && (
        <div className="deduction-notification success" onClick={() => setSuccess("")}>
          <span>✓</span> {success}
          <button className="notif-close">✕</button>
        </div>
      )}

      <form className="deduction-form" onSubmit={hasSettings ? handleUpdate : handleSubmit}>

        {/* ── Time Settings ── */}
        <div className="deduction-section">
          <div className="deduction-section-header">
            <span>⏰</span>
            <h2>Time Rules</h2>
          </div>
          <div className="deduction-grid">
            <div className="deduction-field">
              <label>Late Arrival Time</label>
              <p className="field-hint">Employees arriving after this time are marked late</p>
              <input
                type="time"
                value={lateArrivalTime}
                onChange={(e) => setLateArrivalTime(e.target.value)}
              />
            </div>
            <div className="deduction-field">
              <label>Half Day Time</label>
              <p className="field-hint">Employees arriving after this time get half day</p>
              <input
                type="time"
                value={allowedHalfDayTime}
                onChange={(e) => setAllowedHalfDayTime(e.target.value)}
              />
            </div>
            <div className="deduction-field">
              <label>Allowed Total Leaves (per month)</label>
              <p className="field-hint">Max leaves before deduction starts</p>
              <input
                type="number"
                min="0"
                value={allowedTotalLeave}
                onChange={(e) => setAllowedTotalLeave(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Deduction Settings ── */}
        <div className="deduction-section">
          <div className="deduction-section-header">
            <span>💰</span>
            <h2>Deduction Amounts (PKR)</h2>
          </div>
          <div className="deduction-grid">
            <div className="deduction-field">
              <label>Deduction Per Late</label>
              <p className="field-hint">Amount deducted per late arrival</p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={deductionPerLate}
                  onChange={(e) => setDeductionPerLate(e.target.value)}
                />
              </div>
            </div>
            <div className="deduction-field">
              <label>Deduction Per Half Day</label>
              <p className="field-hint">Amount deducted per half day</p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={deductionPerHalfDay}
                  onChange={(e) => setDeductionPerHalfDay(e.target.value)}
                />
              </div>
            </div>
            <div className="deduction-field">
              <label>Deduction Per Absence</label>
              <p className="field-hint">Amount deducted per absent day</p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={deductionPerAbsence}
                  onChange={(e) => setDeductionPerAbsence(e.target.value)}
                />
              </div>
            </div>
            <div className="deduction-field">
              <label>Exceeds Leave Deduction</label>
              <p className="field-hint">Extra deduction when leaves exceed allowed limit</p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={exceedsTotalLeaveDeduction}
                  onChange={(e) => setExceedsTotalLeaveDeduction(e.target.value)}
                />
              </div>
            </div>
            <div className="deduction-field">
              <label>Exceeds Half Day Deduction</label>
              <p className="field-hint">Extra deduction when half days exceed limit</p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={exceedsHalfDayDeduction}
                  onChange={(e) => setExceedsHalfDayDeduction(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="deduction-btn-row">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-save"
            disabled={loading}
          >
            {loading ? (
              <span className="deduction-spinner"></span>
            ) : hasSettings ? (
              "Update Settings →"
            ) : (
              "Save Settings →"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default DeductionSettings;