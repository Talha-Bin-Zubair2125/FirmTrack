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
      const response = await API.post("/admin/qr/generate", {}, { withCredentials: true });
      setQrImage(response.data.qrImage);
    } catch (error) {
      console.error("Error generating QR:", error);
      setToastMessage("Failed to generate QR Code");
      setTimeout(() => setToastMessage(""), 3000);
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
    setToastMessage("QR Code refreshed!");
    setTimeout(() => setToastMessage(""), 3000);
  }, [generateNewQR]);
  
  useEffect(() => {
    generateNewQR();
  }, [generateNewQR]);

  const progressWidth = `${(countdown / 15) * 100}%`;
  return (
    <div className="qr-wrapper">
      {toastMessage && <div className="qr-toast">{toastMessage}</div>}
      <button className="qr-back" onClick={() => navigate("/profile")}>
        &larr; Back to Dashboard
      </button>
      <div className="qr-header">
        <h1>Attendance QR Code</h1>
        <p>Employees scan this code to mark their attendance</p>
      </div>
      <div className="qr-card">
        <div className="qr-status">
          <div className="qr-status-dot"></div>
          QR Code Active
        </div>
        <div className="qr-image-container">
          {loading ? (
            <div className="qr-loading">
              <div className="qr-spinner"></div>
              <p>Generating...</p>
            </div>
          ) : qrImage ? (
            <img src={qrImage} alt="Attendance QR Code" />
          ) : null}
        </div>
        <div className="qr-countdown">
          <p className="qr-countdown-label">Refreshes in</p>
          <p className={`qr-countdown-timer ${countdown <= 5 ? "urgent" : ""}`}>
            {countdown}s
          </p>
          <div className="qr-progress-bar">
            <div className="qr-progress-fill" style={{ width: progressWidth }}></div>
          </div>
        </div>
        <button className="qr-refresh-btn" onClick={handleRefresh} disabled={loading}>
          {loading ? "Generating..." : "↻ Refresh Now"}
        </button>
        <div className="qr-info">
          <div className="qr-info-item">
            <span>⏱</span>
            <p>Expires in 15s</p>
          </div>
          <div className="qr-info-item">
            <span>🔒</span>
            <p>Secure Token</p>
          </div>
          <div className="qr-info-item">
            <span>📱</span>
            <p>Mobile Scan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default QRCode;