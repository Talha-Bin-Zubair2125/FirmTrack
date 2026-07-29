import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../stylings/QRCode.css";

function QRCode() {
  const [qrImage, setQrImage] = useState(null); 
  const [countdown, setCountdown] = useState(15);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // generate QR on mount
  useEffect(() => {
    generateNewQR();
  }, []);

  // countdown timer + auto refresh
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
  }, []);

  const generateNewQR = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3000/api/admin/qr/generate",
        {},
        { withCredentials: true }
      );
      setQrImage(response.data.qrImage); // base64 image 
    } catch (error) {
      console.error("Error generating QR:", error);
    } finally {
      setLoading(false);
    }
  };

  // manual refresh — generates new QR + resets timer 
  const handleRefresh = async () => {
    await generateNewQR();
    setCountdown(15); // reset timer on manual refresh
  };

  // progress bar width based on countdown
  const progressWidth = `${(countdown / 15) * 100}%`;

  return (
    <div className="qr-wrapper">

      {/* ── Back Button ── */}
      <button className="qr-back" onClick={() => navigate("/profile")}>
        ← Back to Dashboard
      </button>

      {/* ── Header ── */}
      <div className="qr-header">
        <h1>Attendance QR Code</h1>
        <p>Employees scan this code to mark their attendance</p>
      </div>

      {/* ── Main Card ── */}
      <div className="qr-card">

        {/* ── Status Badge ── */}
        <div className="qr-status">
          <div className="qr-status-dot"></div>
          QR Code Active
        </div>

        {/* ── QR Image ── */}
        <div className="qr-image-container">
          {loading ? (
            <div className="qr-loading">
              <div className="qr-spinner"></div>
              <p>Generating...</p>
            </div>
          ) : qrImage ? ( // ✅ only render when qrImage exists
            <img src={qrImage} alt="Attendance QR Code" />
          ) : null}
        </div>

        {/* ── Countdown ── */}
        <div className="qr-countdown">
          <p className="qr-countdown-label">Refreshes in</p>
          <p className={`qr-countdown-timer ${countdown <= 5 ? "urgent" : ""}`}>
            {countdown}s
          </p>
          <div className="qr-progress-bar">
            <div
              className="qr-progress-fill"
              style={{ width: progressWidth }}
            ></div>
          </div>
        </div>

        {/* ── Refresh Button ── */}
        <button
          className="qr-refresh-btn"
          onClick={handleRefresh} // ✅ resets timer + generates new QR
          disabled={loading}
        >
          {loading ? "Generating..." : "↻ Refresh Now"}
        </button>

        {/* ── Info ── */}
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