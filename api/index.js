const express = require("express");
const app = require("../backend/server");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();


const ConnectDB = require("../backend/db");

const authRoutes = require("../backend/routes/authRoutes");
const employeeRoutes = require("../backend/routes/employeeRoutes");
const qrRoutes = require("../backend/routes/qrRoutes");
const deductionRoutes = require("../backend/routes/deductionRoutes");
const attendanceRoutes = require("../backend/routes/attendanceRoutes");

// const app = express();

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://firm-track.vercel.app",
    ],
    credentials: true,
  }),
);

app.use(express.json());

// Cookies
app.use(cookieParser(process.env.CookieSecret));

// Database
ConnectDB();

// Routes
app.use("/api/auth", authRoutes);

app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Attendance API running on Vercel",
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend deployed successfully",
  });
});

// IMPORTANT FOR VERCEL
module.exports = app;
