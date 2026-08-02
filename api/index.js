const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());


// Routes
const authRoutes = require("../backend/routes/authRoutes");
const employeeRoutes = require("../backend/routes/employeeRoutes");
const qrRoutes = require("../backend/routes/qrRoutes");
const deductionRoutes = require("../backend/routes/deductionRoutes");
const attendanceRoutes = require("../backend/routes/attendanceRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);


app.get("/api/test", (req, res) => {
    res.json({
        message: "Backend is running on Vercel"
    });
});


module.exports = app;