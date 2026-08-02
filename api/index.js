const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://firm-track.vercel.app"
    ],
    credentials: true
  })
);

app.use(express.json());

const authRoutes = require("../backend/routes/authRoutes");
const employeeRoutes = require("../backend/routes/employeeRoutes");
const qrRoutes = require("../backend/routes/qrRoutes");
const deductionRoutes = require("../backend/routes/deductionRoutes");
const attendanceRoutes = require("../backend/routes/attendanceRoutes");
const ConnectDB = require("../backend/db");


app.use("/api/auth", authRoutes);
app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);


ConnectDB();

app.get("/api/test", (req,res)=>{
    res.json({
        message:"Backend is running on Vercel"
    });
});


module.exports = app;