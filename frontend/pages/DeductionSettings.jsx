import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../stylings/DeductionSettings.css";
import API from "../src/api/axios";

function DeductionSettings() {
  const navigate = useNavigate();
  const [lateArrivalTime, setLateArrivalTime] = useState("09:00");
  const [allowedTotalLeave, setAllowedTotalLeave] = useState(2);
  const [allowedHalfDayTime, setAllowedHalfDayTime] = useState("13:00");
  const [deductionPerLate, setDeductionPerLate] = useState(0);
  const [deductionPerHalfDay, setDeductionPerHalfDay] = useState(0);
  const [deductionPerAbsence, setDeductionPerAbsence] = useState(0);
  const [exceedsTotalLeaveDeduction, setExceedsTotalLeaveDeduction] =
    useState(0);
  const [exceedsHalfDayDeduction, setExceedsHalfDayDeduction] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  const fetchDeductionSettings = useCallback(async () => {
    try {
      const response = await API.get("/admin/settings/deduction", {
        withCredentials: true,
      });
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
        setHasSettings(true);
      }
    } catch (err) {
      console.error("Error fetching deduction settings:", err);
      setHasSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchDeductionSettings();
  }, [fetchDeductionSettings]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await API.post("/admin/add/deduction", getFormData(), {
        withCredentials: true,
      });
      setSuccess("Deduction settings saved successfully!");
      setHasSettings(true);
    } catch (err) {
      setError(err.response?.data?.message || "Error saving settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await API.put("/admin/update/deduction", getFormData(), {
        withCredentials: true,
      });
      setSuccess("Deduction settings updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Error updating settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deduction-wrapper">
      <button className="deduction-back" onClick={() => navigate("/profile")}>
        &larr; Back to Dashboard
      </button>

      <div className="deduction-header">
        <h1>Deduction Settings</h1>
        <p>Configure attendance rules and salary deductions</p>
      </div>

      {error && (
        <div
          className="deduction-notification error"
          onClick={() => setError("")}
        >
          <span>⚠</span> {error}
          <button className="notif-close">✕</button>
        </div>
      )}

      {success && (
        <div
          className="deduction-notification success"
          onClick={() => setSuccess("")}
        >
          <span>✓</span> {success}
          <button className="notif-close">✕</button>
        </div>
      )}

      <form
        className="deduction-form"
        onSubmit={hasSettings ? handleUpdate : handleSubmit}
      >
        <div className="deduction-section">
          <div className="deduction-section-header">
            <span>⏰</span>
            <h2>Time Rules</h2>
          </div>
          <div className="deduction-grid">
            <div className="deduction-field">
              <label>Late Arrival Time</label>
              <p className="field-hint">
                Employees arriving after this time are marked late
              </p>
              <input
                type="time"
                value={lateArrivalTime}
                onChange={(e) => setLateArrivalTime(e.target.value)}
                required
              />
            </div>

            <div className="deduction-field">
              <label>Half Day Time</label>
              <p className="field-hint">
                Employees arriving after this time get half day
              </p>
              <input
                type="time"
                value={allowedHalfDayTime}
                onChange={(e) => setAllowedHalfDayTime(e.target.value)}
                required
              />
            </div>

            <div className="deduction-field full-width">
              <label>Allowed Total Leaves (per month)</label>
              <p className="field-hint">
                Max leaves before extra leave deduction applies
              </p>
              <input
                type="number"
                min="0"
                value={allowedTotalLeave}
                onChange={(e) => setAllowedTotalLeave(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

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
                  required
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
                  required
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
                  required
                />
              </div>
            </div>

            <div className="deduction-field">
              <label>Exceeds Leave Deduction</label>
              <p className="field-hint">
                Extra deduction when leaves exceed limit
              </p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={exceedsTotalLeaveDeduction}
                  onChange={(e) =>
                    setExceedsTotalLeaveDeduction(e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className="deduction-field full-width">
              <label>Exceeds Half Day Deduction</label>
              <p className="field-hint">
                Extra deduction when half days exceed limit
              </p>
              <div className="input-prefix">
                <span>PKR</span>
                <input
                  type="number"
                  min="0"
                  value={exceedsHalfDayDeduction}
                  onChange={(e) => setExceedsHalfDayDeduction(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="deduction-btn-row">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>
          <button type="submit" className="btn-save" disabled={loading}>
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
