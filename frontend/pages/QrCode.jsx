import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../stylings/QRCode.css";
import API from "../src/api/axios";

function QRCode() {
  const [qrImage, setQrImage] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  const generateNewQR = useCallback(async () => {
    setLoading(true);
    try {
      const response = await API.post(
        "/admin/qr/generate",
        {},
        { withCredentials: true },
      );
      setQrImage(response.data.qrImage);
    } catch (error) {
      console.error("Error generating QR:", error);
      setToastMessage("Failed to generate QR Code");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          generateNewQR();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [generateNewQR]);

  const handleRefresh = useCallback(async () => {
    await generateNewQR();
    setCountdown(15);
    setToastMessage("QR Code refreshed successfully!");
  }, [generateNewQR]);

  useEffect(() => {
    generateNewQR();
  }, [generateNewQR]);

  const progressWidth = `${(countdown / 15) * 100}%`;

  return (
    <div className="qr-wrapper">
      <div className="qr-topbar">
        <button className="qr-back" onClick={() => navigate("/profile")}>
          &larr; Back to Dashboard
        </button>
        <div className="qr-brand">
          <span className="brand-logo">N</span>
          <h2>NutroAttend</h2>
        </div>
      </div>

      <div className="qr-container">
        {toastMessage && (
          <div
            className="qr-notification success"
            onClick={() => setToastMessage("")}
          >
            <span>✓</span>
            <div>
              <strong>Notification</strong>
              <p>{toastMessage}</p>
            </div>
            <button className="notif-close">✕</button>
          </div>
        )}

        <div className="qr-card">
          <div className="qr-card-header">
            <div className="qr-header-icon">📷</div>
            <div>
              <h2>Attendance QR Code</h2>
              <p>
                Employees scan this dynamic code to instantly mark their
                attendance
              </p>
            </div>
            <div className="qr-status-badge">
              <span className="qr-status-dot"></span>
              Active
            </div>
          </div>

          <div className="qr-image-wrapper">
            {loading ? (
              <div className="qr-loading">
                <div className="qr-spinner"></div>
                <p>Generating secure code...</p>
              </div>
            ) : qrImage ? (
              <div className="qr-image-frame">
                <img src={qrImage} alt="Attendance QR Code" />
              </div>
            ) : null}
          </div>

          <div className="qr-countdown-section">
            <div className="qr-countdown-info">
              <span className="qr-countdown-label">Automatic Refresh In</span>
              <span
                className={`qr-countdown-timer ${countdown <= 5 ? "urgent" : ""}`}
              >
                {countdown}s
              </span>
            </div>
            <div className="qr-progress-bar">
              <div
                className="qr-progress-fill"
                style={{ width: progressWidth }}
              ></div>
            </div>
          </div>

          <div className="qr-action-row">
            <button
              className="qr-refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <span className="qr-spinner-small"></span>
              ) : (
                "↻ Refresh Now"
              )}
            </button>
          </div>

          <div className="qr-info-grid">
            <div className="qr-info-item">
              <span className="qr-info-icon">⏱</span>
              <div>
                <strong>15s Rotation</strong>
                <p>High security token</p>
              </div>
            </div>
            <div className="qr-info-item">
              <span className="qr-info-icon">🔒</span>
              <div>
                <strong>Encrypted</strong>
                <p>Prevent spoofing</p>
              </div>
            </div>
            <div className="qr-info-item">
              <span className="qr-info-icon">📱</span>
              <div>
                <strong>Instant Scan</strong>
                <p>App compatible</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRCode;
