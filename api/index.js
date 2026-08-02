const express = require("express");
const cors = require("cors");
require("dotenv").config();

const ConnectDB = require("../backend/db");

const authRoutes = require("../backend/routes/authRoutes");
const employeeRoutes = require("../backend/routes/employeeRoutes");
const qrRoutes = require("../backend/routes/qrRoutes");
const deductionRoutes = require("../backend/routes/deductionRoutes");
const attendanceRoutes = require("../backend/routes/attendanceRoutes");

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://firm-track.vercel.app"
    ],
    credentials: true
  })
);

app.use(express.json());


ConnectDB();


app.use("/api/auth", authRoutes);
app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);


app.get("/", (req,res)=>{
    res.json({
        message:"FirmTrack Backend Running"
    });
});


module.exports = app;