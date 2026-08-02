# FirmTrack

A full-stack **Employee Attendance & Payroll Management System** built using the **MERN Stack**. FirmTrack enables organizations to efficiently manage employees, record attendance using QR codes, configure salary deduction rules, and generate attendance-based payroll reports.

---

## 📌 Overview

FirmTrack is designed to simplify attendance tracking and payroll management by automating attendance recording and salary deduction calculations. Employees can mark their attendance by scanning a QR code, while administrators can manage employees, configure deduction policies, and generate detailed attendance reports.

---

## ✨ Features

### 👨‍💼 Admin

- Secure Admin Authentication
- Add New Employees
- Update Employee Information
- View All Employees
- Configure Attendance Deduction Rules
- Generate Attendance Reports
- Generate Payroll Reports
- Automatic Salary Deduction Calculation
- View Employee Attendance History
- Manage QR Code Attendance

### 👨‍💻 Employee

- Login Securely
- Scan QR Code for Attendance
- View Personal Attendance History
- View Salary Reports
- Update Profile

---

## 📊 Attendance & Payroll

FirmTrack automatically:

- Records employee attendance through QR code scanning.
- Calculates salary deductions based on configured deduction rules.
- Generates attendance reports.
- Generates payroll reports with deduction details.
- Maintains attendance history for every employee.

---

## 🚀 Tech Stack

### Frontend

- React.js
- Vite
- React Context API
- Axios
- HTML5
- CSS3
- JavaScript (ES6)

### Backend

- Node.js
- Express.js
- JWT Authentication
- REST API

### Database

- MongoDB
- Mongoose

---

## 📁 Project Structure

```
FirmTrack
│
├── backend
│   ├── controllers
│   ├── middlewares
│   ├── models
│   ├── routes
│   ├── db.js
│   ├── server.js
│   └── package.json
│
├── frontend
│   ├── src
│   ├── pages
│   ├── context
│   ├── public
│   ├── assets
│   └── package.json
│
└── README.md
```

---

## 🔐 Authentication

- JWT Authentication
- Protected Routes
- Role-Based Access (Admin & Employee)

---

## 📱 QR Code Attendance

Employees can:

- Scan QR Code
- Mark Attendance
- Prevent duplicate attendance
- Store attendance with date and time

---

## 📈 Reports

The system generates:

- Daily Attendance Report
- Monthly Attendance Report
- Employee Attendance Summary
- Payroll Report
- Salary Deduction Report

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/FirmTrack.git
```

---

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=3000
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
JWT_SECRET=YOUR_SECRET_KEY
```

Run Backend

```bash
npm start
```

or

```bash
npm run dev
```

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## 📸 Screens

- Login
- Dashboard
- Employee Management
- QR Attendance
- Attendance History
- Deduction Settings
- Reports

---

## Future Improvements

- Email Notifications
- Leave Management
- Face Recognition Attendance
- Multi-Branch Support
- Excel & PDF Report Export
- Dashboard Analytics
- Employee Profile Pictures

---

## Author

**Talha Bin Zubair**

GitHub:
https://github.com/Talha-Bin-Zubair2125

---

## License

This project is developed for learning, portfolio, and academic purposes.
