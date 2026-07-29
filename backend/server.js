const express = require("express");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const ConnectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const qrRoutes = require("./routes/qrRoutes");
const deductionRoutes = require("./routes/deductionRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const cors = require("cors");
const cron = require("node-cron");

const app = express();

// Sab se safe aur clean approach for cross-origin and cookie sharing
app.use(cors({ 
  origin: "http://localhost:5173", 
  credentials: true 
}));

const cookie_secret = process.env.CookieSecret;
app.use(cookieParser(cookie_secret));
app.use(express.json());

// Connect to MongoDB
ConnectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", employeeRoutes);
app.use("/api/admin", qrRoutes);
app.use("/api/admin", deductionRoutes);
app.use("/api/admin", attendanceRoutes);

// Simple test route
app.get("/", (req, res) => {
    res.send("Welcome to the Attendance System API!");
});

// ── Shared absent marking logic ──
const markAbsentForDate = async (dateStr) => {
    const { backfillAbsentForDate } = require("./controllers/attendanceController");
    return await backfillAbsentForDate(dateStr);
};

// ── Cron Job — runs every day at 11:59 PM PKT (6:59 PM UTC) ──
cron.schedule("59 18 * * *", async () => {
    console.log("⏰ Running absent marking cron job...");
    try {
        // get today's date in PKT
        const pktNow = new Date(new Date().getTime() + 5 * 60 * 60000);
        const todayStr = pktNow.toISOString().split("T")[0];

        const count = await markAbsentForDate(todayStr);
        console.log(`✅ Cron job done — ${count} absent records created`);
    } catch (error) {
        console.error("❌ Cron job error:", error);
    }
}, {
    timezone: "UTC"
});

// ── Backfill Route — mark absent for any specific date ──
app.get("/api/test/markabsent", async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            // no date provided → use today
            const pktNow = new Date(new Date().getTime() + 5 * 60 * 60000);
            const todayStr = pktNow.toISOString().split("T")[0];
            const count = await markAbsentForDate(todayStr);
            return res.json({ message: `✅ ${count} absent records created for today (${todayStr})` });
        }

        // specific date provided
        const count = await markAbsentForDate(date);
        res.json({ message: `✅ ${count} absent records created for ${date}` });

    } catch (error) {
        console.error("Backfill error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});