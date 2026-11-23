import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate,
} from "react-router-dom";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import { db, auth } from "./firebase";
// Safe arithmetic evaluator: supports numbers, parentheses and + - * / %.
// It does not execute JavaScript or access browser/runtime objects.
function evaluateArithmetic(expression) {
  const input = String(expression).replace(/×/g, "*").replace(/÷/g, "/");
  const tokens = input.match(/\d+(?:\.\d+)?|[()+\-*/%]/g) || [];
  if (!tokens.length || tokens.join("") !== input.replace(/\s+/g, "")) {
    throw new Error("Invalid expression");
  }
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  function primary() {
    if (peek() === "+") { take(); return primary(); }
    if (peek() === "-") { take(); return -primary(); }
    if (peek() === "(") {
      take(); const value = addSub();
      if (take() !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    const token = take();
    if (token === undefined || !/^\d+(?:\.\d+)?$/.test(token)) throw new Error("Expected a number");
    return Number(token);
  }
  function mulDiv() {
    let value = primary();
    while (["*", "/", "%"].includes(peek())) {
      const op = take(); const rhs = primary();
      if ((op === "/" || op === "%") && rhs === 0) throw new Error("Division by zero");
      value = op === "*" ? value * rhs : op === "/" ? value / rhs : value % rhs;
    }
    return value;
  }
  function addSub() {
    let value = mulDiv();
    while (peek() === "+" || peek() === "-") {
      const op = take(); const rhs = mulDiv();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }
  const result = addSub();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("Invalid expression");
  return result;
}

function LandingPage() {
  const navigate = useNavigate();
  const features = [
    ["⛽", "Fuel tracker", "Record petrol and diesel meter readings and calculate dispensed litres."],
    ["⌗", "Fuel calculator", "Calculate fuel amounts from litres and the current rate per litre."],
    ["▤", "Reports", "Review saved readings and view sales summaries and trends."],
    ["◷", "Attendance", "Mark daily attendance and review staff check-in records."],
    ["✧", "AI image analyzer", "Upload an image, review extracted values and calculate supported figures."],
    ["♧", "Staff & leave", "View staff information and manage leave requests in one workspace."],
  ];
  const steps = [
    ["01", "Sign in securely", "Open the staff workspace using your authorised Gmail account."],
    ["02", "Choose a task", "Use the sidebar to open Fuel Tracker, Calculator, Reports, Attendance or AI Image Analyzer."],
    ["03", "Enter or upload", "Record meter readings manually, or upload an image for analysis and check the extracted values."],
    ["04", "Review and save", "Check the calculations, save your records and revisit summaries in Reports."],
  ];
  return <div className="landing-page">
    <header className="landing-nav">
      <a className="landing-brand" href="#top"><img src="/aarush-logo.jpg" alt="AARUSH – Smart Petrol Bunk Assistant" /></a>
      <nav><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#how-to-use">How to use</a></nav>
      <button className="landing-login" onClick={() => navigate("/login")}>♙ Login</button>
    </header>
    <main id="top">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-kicker">SMART • EFFICIENT • RELIABLE</span>
          <h1>Run your fuel station with <em>clarity.</em></h1>
          <p>AARUSH brings everyday petrol bunk operations into one simple workspace — from fuel readings and calculations to staff attendance, reports and image-based analysis.</p>
          <div className="hero-actions"><button className="hero-primary" onClick={() => navigate("/login")}>Enter AARUSH <span>→</span></button><a href="#how-it-works">Explore how it works ↓</a></div>
          <div className="hero-points"><span>✓ Easy daily records</span><span>✓ Clear calculations</span><span>✓ One shared workspace</span></div>
        </div>
        <div className="hero-visual"><img src="/station-hero.jpg" alt="Petrol station forecourt" /><div className="hero-visual-tag"><b>AARUSH</b><span>Smart Petrol Bunk Assistant</span></div></div>
      </section>
      <section className="landing-section" id="features">
        <div className="section-heading"><span>YOUR DAILY WORKSPACE</span><h2>Everything important, in one place.</h2><p>Use the tools you need without adding unnecessary modules to your workflow.</p></div>
        <div className="landing-feature-grid">{features.map(([icon,title,desc]) => <article className="landing-feature" key={title}><div className="feature-icon">{icon}</div><h3>{title}</h3><p>{desc}</p></article>)}</div>
      </section>
      <section className="landing-how" id="how-it-works">
        <div className="section-heading"><span>A SIMPLE WORKFLOW</span><h2>How AARUSH works</h2><p>Start with a secure sign-in, complete your daily work and keep the information organised.</p></div>
        <div className="landing-steps">{steps.map(([number,title,desc]) => <article className="landing-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{desc}</p></div></article>)}</div>
      </section>
      <section className="landing-guide" id="how-to-use">
        <div><span className="guide-kicker">QUICK USER GUIDE</span><h2>How to use AARUSH</h2><p>Follow these steps when you start your shift.</p>
          <ol><li><b>Login:</b> Select Login and enter your authorised email and password.</li><li><b>Open the required page:</b> Choose the relevant tool from the left navigation.</li><li><b>Enter accurate details:</b> Select the date and shift, then enter the meter readings or other information.</li><li><b>Check before saving:</b> Review the calculated litres and amounts. Correct any value that is wrong.</li><li><b>View your records:</b> Open Reports to review saved information and export available reports.</li></ol>
        </div>
        <aside className="guide-note"><div className="guide-note-icon">ⓘ</div><h3>For reliable results</h3><p>Always verify readings and extracted values before saving. Image analysis can only calculate figures supported by the uploaded image and the information you provide.</p><button onClick={() => navigate("/login")}>Go to Login →</button></aside>
      </section>
    </main>
    <footer className="landing-footer"><img src="/aarush-logo.jpg" alt="AARUSH logo" /><span>© {new Date().getFullYear()} AARUSH Smart Petrol Bunk Assistant</span><a href="#top">Back to top ↑</a></footer>
  </div>;
}

const ADMIN_EMAIL = "urreddy978@gmail.com";

function Login({ setIsLoggedIn, setRole }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

const login = async () => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    alert("Please enter your email and password.");
    return;
  }

  let userCredential;

  // Step 1: Authenticate with Firebase
  try {
    userCredential = await signInWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );
  } catch (error) {
    console.error("Firebase login error:", error);

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      alert("Incorrect email or password. Please try again.");
    } else if (error.code === "auth/network-request-failed") {
      alert("Network error. Please check your internet connection.");
    } else {
      alert(`Login failed: ${error.code || error.message}`);
    }
    return;
  }

  // Step 2: Load the user's Firestore profile
  const uid = userCredential.user.uid;
  let userDoc;

  try {
    userDoc = await getDoc(doc(db, "users", uid));
  } catch (error) {
    console.error("Firestore profile loading error:", error);

    alert(
      "Your password was accepted, but your AARUSH profile could not be loaded. Please try again."
    );
    return;
  }

  if (!userDoc.exists()) {
    await signOut(auth);
    alert("User profile not found. Please contact the administrator.");
    return;
  }

  const userData = userDoc.data();
  const signedInEmail = (
    userCredential.user.email || normalizedEmail
  ).toLowerCase();

  if (signedInEmail === ADMIN_EMAIL && userData.role !== "admin") {
    await signOut(auth);
    alert("Admin account is not configured correctly in Firebase.");
    return;
  }

  if (userData.role === "staff" && userData.approved !== true) {
    await signOut(auth);
    alert("Your registration is awaiting admin approval.");
    return;
  }

  if (signedInEmail !== ADMIN_EMAIL && userData.role === "admin") {
    await signOut(auth);
    alert("Admin access is restricted to the configured administrator email.");
    return;
  }

  // Step 3: Complete login
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("role", userData.role);
  localStorage.setItem("name", userData.name || "Team member");
  localStorage.setItem("email", signedInEmail);

  setIsLoggedIn(true);
  setRole(userData.role);

  navigate("/dashboard");
};
const forgotPassword = async () => {
  if (!email) {
    alert("Enter your email first");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Password reset email sent!");
  } catch (error) {
    console.log(error);
    alert("Error sending reset email");
  }
};
  const register = async () => {
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        name,
        email,
        role: "staff",
approved: false,
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);
      alert("Staff registration submitted. You can log in after the admin approves your account.");

      setIsRegister(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.log(error);
      alert("Error registering user");
    }
  };

  return (
    <div id="loginPage">
      <div className="login-card">
        <img className="login-brand-logo" src="/aarush-logo.jpg" alt="AARUSH Smart Petrol Bunk Assistant" />

        <h3>{isRegister ? "Register Staff" : "Login"}</h3>

        {isRegister && (
          <div className="input-group">
            <label>Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter staff name"
            />
          </div>
        )}

        <div className="input-group">
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
        </div>

        <div className="input-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
        </div>

        {isRegister ? (
          <button className="login-btn" onClick={register}>
            REGISTER STAFF
          </button>
        ) : (
          <button className="login-btn" onClick={login}>
            LOGIN
          </button>
        )}
<button
  className="switch-btn"
  onClick={forgotPassword}
>
  Forgot Password?
</button>
{email.trim().toLowerCase() !== ADMIN_EMAIL && (
  <button className="switch-btn" onClick={() => setIsRegister((value) => !value)}>
    {isRegister ? "Already registered? Login" : "New staff member? Register"}
  </button>
)}

      </div>
    </div>
  );
}
function Layout({ children, setIsLoggedIn, setRole, role }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const userName = localStorage.getItem("name") || "Team member";
  const links = [
    ["/dashboard", "Overview", "▦"],
    ["/tracker", "Fuel tracker", "⛽"],
    ["/calculator", "Calculator", "⌗"],
    ["/reports", "Reports", "▤"],
    ["/attendance", "Attendance", "◷"],
    ["/ai-analyzer", "AI image analyzer", "✧"],
  ];
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase sign-out failed:", error);
    } finally {
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("role");
      localStorage.removeItem("name");
      localStorage.removeItem("email");
      setIsLoggedIn(false);
      setRole("");
      navigate("/");
    }
  };
  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark">⛽</div><div><b>AARUSH</b><small>SMART PETROL BUNK</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav">
          {links.map(([path, label, icon]) => <Link key={path} to={path} onClick={() => setMenuOpen(false)} className={window.location.pathname === path ? "active" : ""}><span>{icon}</span>{label}</Link>)}
        </nav>
        <div className="sidebar-bottom"><div className="user-mini"><div className="avatar">{userName.slice(0,1).toUpperCase()}</div><div><b>{userName}</b><small>Authorised access</small></div></div><button className="logout-btn" onClick={logout}>↪ <span>Sign out</span></button></div>
      </aside>
      <main className="app-main">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button><div><span className="eyebrow">AARUSH WORKSPACE</span><h1>{links.find(x => x[0] === window.location.pathname)?.[1] || "Smart Petrol Bunk Assistant"}</h1></div><div className="topbar-right"><span className="status-dot"></span><span>System ready</span><div className="top-avatar">{userName.slice(0,1).toUpperCase()}</div></div></header>
        <section className="page-content">{children}</section>
        <footer className="app-footer">AARUSH Smart Petrol Bunk Assistant <span>•</span> Fuel operations made simpler</footer>
      </main>
    </div>
  );
}

function Dashboard({ reports }) {
  const dashboard = reports.reduce(
    (total, r) => {
      total.sales += Number(r.grand) || 0;
      total.msLiters += Number(r.msLiters) || 0;
      total.hsdLiters += Number(r.hsdLiters) || 0;
      total.cash += Number(r.cash) || 0;
      total.online += Number(r.online) || 0;
      return total;
    },
    { sales: 0, msLiters: 0, hsdLiters: 0, cash: 0, online: 0 }
  );

  return (
    <>
      <h3>Admin Dashboard</h3>

      <div className="dashboard-grid">
        <div className="dash-card">
          <span>Total Sales</span>
          <b>₹{dashboard.sales.toFixed(2)}</b>
        </div>

        <div className="dash-card">
          <span>MS Liters</span>
          <b>{dashboard.msLiters.toFixed(2)} L</b>
        </div>

        <div className="dash-card">
          <span>HSD Liters</span>
          <b>{dashboard.hsdLiters.toFixed(2)} L</b>
        </div>

        <div className="dash-card">
          <span>Cash</span>
          <b>₹{dashboard.cash.toFixed(2)}</b>
        </div>

        <div className="dash-card">
          <span>Online</span>
          <b>₹{dashboard.online.toFixed(2)}</b>
        </div>

        <div className="dash-card">
          <span>Reports</span>
          <b>{reports.length}</b>
        </div>
      </div>
    </>
  );
}
function CalculatorPage() {
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");

  const calculateValue = () => {
    try {
      const result = evaluateArithmetic(calcInput);
      setCalcResult(result);
    } catch {
      alert("Invalid calculation");
    }
  };

  const clearCalculator = () => {
    setCalcInput("");
    setCalcResult("");
  };

  return (
    <div className="card calculator-card">
      <h3>🧮 Quick Calculator</h3>

      <input
        type="text"
        placeholder="Example: 5000 + 2500"
        value={calcInput}
        onChange={(e) => setCalcInput(e.target.value)}
      />

      <div className="calculator-buttons">
        {[
          "7",
          "8",
          "9",
          "÷",
          "4",
          "5",
          "6",
          "×",
          "1",
          "2",
          "3",
          "-",
          "0",
          ".",
          "=",
          "+"
        ].map((btn) => (
          <button
            key={btn}
            onClick={() => {
              if (btn === "=") {
                calculateValue();
              } else {
                setCalcInput(calcInput + btn);
              }
            }}
          >
            {btn}
          </button>
        ))}
      </div>

      <button className="clear-btn" onClick={clearCalculator}>
        Clear
      </button>

      <h4>Result: {calcResult}</h4>
    </div>
  );
}
function Tracker({ fetchReports }) {
  const staffName = localStorage.getItem("name") || "staff";

  const [data, setData] = useState({
    msRate: 109.24,
    hsdRate: 97.17,
    ms1s: "",
    ms1e: "",
    ms2s: "",
    ms2e: "",
    hsd1s: "",
    hsd1e: "",
    hsd2s: "",
    hsd2e: "",
    cash: "",
    online: "",
  });
const [calcInput, setCalcInput] = useState("");
const [calcResult, setCalcResult] = useState("");
  const [stock, setStock] = useState({
    msStock: "",
    hsdStock: "",
  });

  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [myLeaveRequests, setMyLeaveRequests] = useState([]);
  const [myAttendance, setMyAttendance] = useState([]);
const [attendanceCalendarDate, setAttendanceCalendarDate] = useState(new Date());
  const v = (key) => Number(data[key]) || 0;
  const diff = (end, start) => (end <= start ? 0 : end - start);
const calculateValue = () => {
  try {
    const result = evaluateArithmetic(calcInput);
    setCalcResult(result);
  } catch (error) {
    alert("Invalid calculation");
  }
};

const clearCalculator = () => {
  setCalcInput("");
  setCalcResult("");
};
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleStockChange = (e) => {
    setStock({
      ...stock,
      [e.target.name]: e.target.value,
    });
  };

  const fetchMyLeaveRequests = async () => {
    try {
      const snapshot = await getDocs(collection(db, "leaveRequests"));
      const data = [];

      snapshot.forEach((item) => {
        const leave = { id: item.id, ...item.data() };
        if (leave.staffName === staffName) data.push(leave);
      });

      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyLeaveRequests(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      const snapshot = await getDocs(collection(db, "attendance"));
      const data = [];

      snapshot.forEach((item) => {
        const record = { id: item.id, ...item.data() };
        if (record.staffName === staffName) data.push(record);
      });

      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMyAttendance(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchMyLeaveRequests();
    fetchMyAttendance();
  }, []);
const getAttendanceForDate = (date) => {
  const formattedDate = date.toISOString().split("T")[0];
  return myAttendance.find((item) => item.date === formattedDate);
};
  const applyLeave = async () => {
    if (!leaveDate || !leaveReason.trim()) {
      alert("Select leave date and enter reason");
      return;
    }

    try {
      await addDoc(collection(db, "leaveRequests"), {
        staffName,
        date: leaveDate,
        reason: leaveReason,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

      setLeaveDate("");
      setLeaveReason("");
      alert("Leave request sent to admin!");
      fetchMyLeaveRequests();
    } catch (error) {
      console.log(error);
      alert("Error applying leave");
    }
  };

  const ms1 = diff(v("ms1e"), v("ms1s"));
  const ms2 = diff(v("ms2e"), v("ms2s"));
  const hsd1 = diff(v("hsd1e"), v("hsd1s"));
  const hsd2 = diff(v("hsd2e"), v("hsd2s"));

  const ms1Amt = ms1 * v("msRate");
  const ms2Amt = ms2 * v("msRate");
  const hsd1Amt = hsd1 * v("hsdRate");
  const hsd2Amt = hsd2 * v("hsdRate");

  const msLiters = ms1 + ms2;
  const hsdLiters = hsd1 + hsd2;

  const msAmount = ms1Amt + ms2Amt;
  const hsdAmount = hsd1Amt + hsd2Amt;

  const grand = msAmount + hsdAmount;
  const paid = v("cash") + v("online");
  const excess = paid - grand;

  const msRemaining = Number(stock.msStock || 0) - msLiters;
  const hsdRemaining = Number(stock.hsdStock || 0) - hsdLiters;

  const msLow = msRemaining > 0 && msRemaining < 1000;
  const hsdLow = hsdRemaining > 0 && hsdRemaining < 1000;

  const saveReport = async () => {
    const now = new Date();

    const report = {
      enteredBy: staffName,
      localId: Date.now(),
      date: now.toLocaleDateString("en-IN"),
      time: now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      createdAt: now.toISOString(),

      msRate: v("msRate").toFixed(2),
      hsdRate: v("hsdRate").toFixed(2),

      ms1Start: v("ms1s").toFixed(2),
      ms1End: v("ms1e").toFixed(2),
      ms1Liters: ms1.toFixed(2),
      ms1Amount: ms1Amt.toFixed(2),

      ms2Start: v("ms2s").toFixed(2),
      ms2End: v("ms2e").toFixed(2),
      ms2Liters: ms2.toFixed(2),
      ms2Amount: ms2Amt.toFixed(2),

      hsd1Start: v("hsd1s").toFixed(2),
      hsd1End: v("hsd1e").toFixed(2),
      hsd1Liters: hsd1.toFixed(2),
      hsd1Amount: hsd1Amt.toFixed(2),

      hsd2Start: v("hsd2s").toFixed(2),
      hsd2End: v("hsd2e").toFixed(2),
      hsd2Liters: hsd2.toFixed(2),
      hsd2Amount: hsd2Amt.toFixed(2),

      msLiters: msLiters.toFixed(2),
      msAmount: msAmount.toFixed(2),
      hsdLiters: hsdLiters.toFixed(2),
      hsdAmount: hsdAmount.toFixed(2),

      grand: grand.toFixed(2),
      cash: v("cash").toFixed(2),
      online: v("online").toFixed(2),
      paid: paid.toFixed(2),
      excess: excess.toFixed(2),

      msOpeningStock: Number(stock.msStock || 0).toFixed(2),
      hsdOpeningStock: Number(stock.hsdStock || 0).toFixed(2),
      msRemaining: msRemaining.toFixed(2),
      hsdRemaining: hsdRemaining.toFixed(2),
    };

    try {
      await addDoc(collection(db, "reports"), report);
      alert("Report saved to Firebase!");
      fetchReports();
    } catch (error) {
      console.log(error);
      alert("Error saving report");
    }
  };

  return (
    <>
      {staffName === "staff" && (
  <div className="card">
        <h3>📝 Apply Leave</h3>

        <input
          type="date"
          value={leaveDate}
          onChange={(e) => setLeaveDate(e.target.value)}
        />

        <textarea
          placeholder="Reason for leave"
          value={leaveReason}
          onChange={(e) => setLeaveReason(e.target.value)}
        />

        <button className="save-btn" onClick={applyLeave}>
          Apply Leave
        </button>

        <h4>My Leave Requests</h4>

        {myLeaveRequests.length === 0 ? (
          <p>No leave requests yet.</p>
        ) : (
          myLeaveRequests.map((leave) => (
            <div className="report-item" key={leave.id}>
              <p><b>Date:</b> {leave.date}</p>
              <p><b>Reason:</b> {leave.reason}</p>
              <p><b>Status:</b> {leave.status}</p>
            </div>
          ))
        )}

        <h4>My Attendance Calendar</h4>

<Calendar
  value={attendanceCalendarDate}
  onChange={setAttendanceCalendarDate}
  tileClassName={({ date }) => {
    const record = getAttendanceForDate(date);

    if (!record) return "";
    if (record.status === "Present") return "present-day";
    if (record.status === "Absent") return "absent-day";
    if (record.status === "Leave") return "leave-day";

    return "";
  }}
/>

<div className="attendance-legend">
  <span className="legend-present">Present</span>
  <span className="legend-absent">Absent</span>
  <span className="legend-leave">Leave</span>
</div>

{getAttendanceForDate(attendanceCalendarDate) ? (
  <div className="report-item">
    <p>
      <b>Date:</b> {getAttendanceForDate(attendanceCalendarDate).date}
    </p>

    <p>
      <b>Status:</b> {getAttendanceForDate(attendanceCalendarDate).status}
    </p>

    <p>
      <b>Marked By:</b> {getAttendanceForDate(attendanceCalendarDate).markedBy}
    </p>
  </div>
) : (
  <p>No attendance marked for selected date.</p>
)}
      </div>
)}

      <div className="card">
        <h3>Fuel Stock</h3>

        <input
          type="number"
          placeholder="MS Petrol Stock Liters"
          name="msStock"
          value={stock.msStock}
          onChange={handleStockChange}
        />

        <input
          type="number"
          placeholder="HSD Diesel Stock Liters"
          name="hsdStock"
          value={stock.hsdStock}
          onChange={handleStockChange}
        />

        <p><b>MS Remaining:</b> {msRemaining.toFixed(2)} L</p>
        <p><b>HSD Remaining:</b> {hsdRemaining.toFixed(2)} L</p>

        {msLow && <div className="stock-alert">⚠️ MS Petrol Stock Low</div>}
        {hsdLow && <div className="stock-alert">⚠️ HSD Diesel Stock Low</div>}
      </div>

      <div className="card">
        <b>MS (Petrol)</b>
        <br />
        ₹/L
        <input
          type="number"
          name="msRate"
          value={data.msRate}
          onChange={handleChange}
        />

        <div className="row">
          <div className="box">
            <b>MS I</b>
            <input type="number" placeholder="Start" name="ms1s" value={data.ms1s} onChange={handleChange} />
            <input type="number" placeholder="End" name="ms1e" value={data.ms1e} onChange={handleChange} />
            <div>{ms1.toFixed(2)} L</div>
            <div className="amount">₹{ms1Amt.toFixed(2)}</div>
          </div>

          <div className="box">
            <b>MS II</b>
            <input type="number" placeholder="Start" name="ms2s" value={data.ms2s} onChange={handleChange} />
            <input type="number" placeholder="End" name="ms2e" value={data.ms2e} onChange={handleChange} />
            <div>{ms2.toFixed(2)} L</div>
            <div className="amount">₹{ms2Amt.toFixed(2)}</div>
          </div>
        </div>

        <p><b>Total MS:</b> {msLiters.toFixed(2)} L | ₹{msAmount.toFixed(2)}</p>
      </div>

      <div className="card">
        <b>HSD (Diesel)</b>
        <br />
        ₹/L
        <input
          type="number"
          name="hsdRate"
          value={data.hsdRate}
          onChange={handleChange}
        />

        <div className="row">
          <div className="box hsd">
            <b>HSD I</b>
            <input type="number" placeholder="Start" name="hsd1s" value={data.hsd1s} onChange={handleChange} />
            <input type="number" placeholder="End" name="hsd1e" value={data.hsd1e} onChange={handleChange} />
            <div>{hsd1.toFixed(2)} L</div>
            <div className="amount">₹{hsd1Amt.toFixed(2)}</div>
          </div>

          <div className="box hsd">
            <b>HSD II</b>
            <input type="number" placeholder="Start" name="hsd2s" value={data.hsd2s} onChange={handleChange} />
            <input type="number" placeholder="End" name="hsd2e" value={data.hsd2e} onChange={handleChange} />
            <div>{hsd2.toFixed(2)} L</div>
            <div className="amount">₹{hsd2Amt.toFixed(2)}</div>
          </div>
        </div>

        <p><b>Total HSD:</b> {hsdLiters.toFixed(2)} L | ₹{hsdAmount.toFixed(2)}</p>
      </div>

      <div className="card summary">
        <h3>Grand Total: ₹{grand.toFixed(2)}</h3>
      </div>

      <div className="card">
        <h3>Payment</h3>
        <input type="number" placeholder="Cash" name="cash" value={data.cash} onChange={handleChange} />
        <input type="number" placeholder="Online" name="online" value={data.online} onChange={handleChange} />
        <p>Paid: ₹{paid.toFixed(2)}</p>
        <p>Excess: ₹{excess.toFixed(2)}</p>
      </div>

      <button className="save-btn" onClick={saveReport}>
        Save Daily Report
      </button>
    </>
  );
}

function Reports({ reports, setReports }) {
  const [editingReport, setEditingReport] = useState(null);
  const [editData, setEditData] = useState({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredReports = reports.filter((report) => {
    const reportDate = new Date(report.createdAt || report.localId || Date.now());

    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate + "T23:59:59") : null;

    if (from && reportDate < from) return false;
    if (to && reportDate > to) return false;

    const searchText = `
      ${report.date}
      ${report.time}
      ${report.msLiters}
      ${report.msAmount}
      ${report.hsdLiters}
      ${report.hsdAmount}
      ${report.cash}
      ${report.online}
      ${report.paid}
      ${report.excess}
      ${report.grand}
      ${report.enteredBy}
    `.toLowerCase();

    return searchText.includes(searchTerm.toLowerCase());
  });

  const monthlySummary = filteredReports.reduce(
    (total, report) => {
      total.sales += Number(report.grand) || 0;
      total.msLiters += Number(report.msLiters) || 0;
      total.hsdLiters += Number(report.hsdLiters) || 0;
      total.cash += Number(report.cash) || 0;
      total.online += Number(report.online) || 0;
      return total;
    },
    { sales: 0, msLiters: 0, hsdLiters: 0, cash: 0, online: 0 }
  );

  const salesChartData = filteredReports.map((report) => ({
    date: report.date,
    sales: Number(report.grand) || 0,
    cash: Number(report.cash) || 0,
    online: Number(report.online) || 0,
  }));

  const fuelPieData = [
    { name: "MS Petrol", value: monthlySummary.msLiters },
    { name: "HSD Diesel", value: monthlySummary.hsdLiters },
  ];

  const paymentPieData = [
    { name: "Cash", value: monthlySummary.cash },
    { name: "Online", value: monthlySummary.online },
  ];

  const COLORS = ["#00C49F", "#FF8042", "#0088FE", "#FFBB28"];

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const liters = (value) =>
    `${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} L`;

  const startEdit = (report) => {
    setEditingReport(report.id);
    setEditData({ ...report });
  };

  const handleEditChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value,
    });
  };

  const cancelEdit = () => {
    setEditingReport(null);
    setEditData({});
  };

  const saveEdit = async () => {
    try {
      await updateDoc(doc(db, "reports", editingReport), {
        msLiters: editData.msLiters,
        msAmount: editData.msAmount,
        hsdLiters: editData.hsdLiters,
        hsdAmount: editData.hsdAmount,
        cash: editData.cash,
        online: editData.online,
        paid: editData.paid,
        excess: editData.excess,
        grand: editData.grand,
      });

      const updatedReports = reports.map((report) =>
        report.id === editingReport ? { ...report, ...editData } : report
      );

      setReports(updatedReports);
      setEditingReport(null);
      setEditData({});
      alert("Report updated successfully!");
    } catch (error) {
      console.log(error);
      alert("Error updating report");
    }
  };

  const deleteReport = async (reportId) => {
    if (!window.confirm("Delete this report?")) return;

    try {
      await deleteDoc(doc(db, "reports", reportId));
      const updatedReports = reports.filter((report) => report.id !== reportId);
      setReports(updatedReports);
      alert("Report deleted successfully!");
    } catch (error) {
      console.log(error);
      alert("Error deleting report");
    }
  };

  const exportExcel = () => {
    if (filteredReports.length === 0) {
      alert("No filtered reports to export.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    const dailySalesData = filteredReports.map((r, index) => ({
      "S.No": index + 1,
      Date: r.date,
      Time: r.time,
      "Entered By": r.enteredBy,
      "MS Liters": r.msLiters,
      "MS Amount": r.msAmount,
      "HSD Liters": r.hsdLiters,
      "HSD Amount": r.hsdAmount,
      Cash: r.cash,
      Online: r.online,
      Paid: r.paid,
      Excess: r.excess,
      "Grand Total": r.grand,
    }));

    const fuelStockData = filteredReports.map((r, index) => ({
      "S.No": index + 1,
      Date: r.date,
      Time: r.time,
      "MS Opening Stock": r.msOpeningStock,
      "MS Remaining": r.msRemaining,
      "HSD Opening Stock": r.hsdOpeningStock,
      "HSD Remaining": r.hsdRemaining,
    }));

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(dailySalesData),
      "Daily Sales"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(fuelStockData),
      "Fuel Stock"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const file = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    saveAs(file, "fuel-station-filtered-reports.xlsx");
  };

  const downloadSingleReportPDF = (report) => {
    const docPdf = new jsPDF();

    docPdf.setFontSize(18);
    docPdf.text("AARUSH FILLING STATION", 14, 15);

    docPdf.setFontSize(12);
    docPdf.text("Single Fuel Report", 14, 25);

    autoTable(docPdf, {
      startY: 35,
      head: [["Field", "Value"]],
      body: [
        ["Date", report.date],
        ["Time", report.time],
        ["Entered By", report.enteredBy || "N/A"],
        ["MS Liters", `${report.msLiters} L`],
        ["MS Amount", `Rs. ${report.msAmount}`],
        ["HSD Liters", `${report.hsdLiters} L`],
        ["HSD Amount", `Rs. ${report.hsdAmount}`],
        ["Cash", `Rs. ${report.cash}`],
        ["Online", `Rs. ${report.online}`],
        ["Paid", `Rs. ${report.paid}`],
        ["Excess", `Rs. ${report.excess}`],
        ["Grand Total", `Rs. ${report.grand}`],
      ],
    });

    docPdf.save(`fuel-report-${report.date}.pdf`);
  };

  const exportPDF = () => {
    if (filteredReports.length === 0) {
      alert("No filtered reports to export.");
      return;
    }

    const docPdf = new jsPDF("landscape");

    docPdf.setFontSize(18);
    docPdf.text("AARUSH FILLING STATION", 14, 15);

    docPdf.setFontSize(11);
    docPdf.text("Filtered Fuel Reports", 14, 23);

    autoTable(docPdf, {
      startY: 30,
      head: [
        [
          "S.No",
          "Date",
          "Time",
          "MS L",
          "MS Amt",
          "HSD L",
          "HSD Amt",
          "Cash",
          "Online",
          "Paid",
          "Excess",
          "Total",
        ],
      ],
      body: filteredReports.map((r, index) => [
        index + 1,
        r.date,
        r.time,
        r.msLiters,
        r.msAmount,
        r.hsdLiters,
        r.hsdAmount,
        r.cash,
        r.online,
        r.paid,
        r.excess,
        r.grand,
      ]),
    });

    docPdf.save("fuel-station-filtered-reports.pdf");
  };

  return (
    <>
      <h3>Admin Reports</h3>

      <div className="search-box">
        <label>Search Reports</label>
        <input
          type="text"
          placeholder="Search date, amount, cash, online..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="filter-box">
        <div>
          <label>From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <label>To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      <h3>Monthly Summary</h3>

      <div className="dashboard-grid">
        <div className="dash-card">
          <span>Filtered Sales</span>
          <b>₹{monthlySummary.sales.toFixed(2)}</b>
        </div>

        <div className="dash-card">
          <span>Filtered MS Liters</span>
          <b>{monthlySummary.msLiters.toFixed(2)} L</b>
        </div>

        <div className="dash-card">
          <span>Filtered HSD Liters</span>
          <b>{monthlySummary.hsdLiters.toFixed(2)} L</b>
        </div>

        <div className="dash-card">
          <span>Filtered Cash</span>
          <b>₹{monthlySummary.cash.toFixed(2)}</b>
        </div>

        <div className="dash-card">
          <span>Filtered Online</span>
          <b>₹{monthlySummary.online.toFixed(2)}</b>
        </div>

        <div className="dash-card">
          <span>Filtered Reports</span>
          <b>{filteredReports.length}</b>
        </div>
      </div>

      <button className="export-btn" onClick={exportExcel}>
        Export Filtered Excel
      </button>

      <button className="pdf-btn" onClick={exportPDF}>
        Export Filtered PDF
      </button>

      <div className="analytics-section">
        <div className="analytics-top">
          <h2>Fuel Station Analytics Dashboard</h2>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>📊 Complete Business Analytics</h3>
            <p>Daily sales, fuel analytics and payment analytics in one dashboard</p>
          </div>

          <div className="chart-grid">
            <div>
              <h4>📈 Daily Sales</h4>

              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => money(value)} />
                  <Bar
                    dataKey="sales"
                    fill="#00C49F"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4>⛽ Fuel Analytics</h4>

              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={fuelPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={70}
                    label
                  >
                    {fuelPieData.map((entry, index) => (
                      <Cell
                        key={`fuel-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => liters(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h4>💳 Payment Analytics</h4>

              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={70}
                    label
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell
                        key={`payment-${index}`}
                        fill={COLORS[(index + 2) % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip formatter={(value) => money(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {filteredReports.length === 0 ? (
          <p>No reports found for selected date.</p>
        ) : (
          filteredReports.map((report, index) => (
            <div className="report-item" key={report.id}>
              {editingReport === report.id ? (
                <>
                  <b>Edit Report</b>

                  <input
                    type="number"
                    name="msLiters"
                    value={editData.msLiters || ""}
                    onChange={handleEditChange}
                    placeholder="MS Liters"
                  />

                  <input
                    type="number"
                    name="msAmount"
                    value={editData.msAmount || ""}
                    onChange={handleEditChange}
                    placeholder="MS Amount"
                  />

                  <input
                    type="number"
                    name="hsdLiters"
                    value={editData.hsdLiters || ""}
                    onChange={handleEditChange}
                    placeholder="HSD Liters"
                  />

                  <input
                    type="number"
                    name="hsdAmount"
                    value={editData.hsdAmount || ""}
                    onChange={handleEditChange}
                    placeholder="HSD Amount"
                  />

                  <input
                    type="number"
                    name="cash"
                    value={editData.cash || ""}
                    onChange={handleEditChange}
                    placeholder="Cash"
                  />

                  <input
                    type="number"
                    name="online"
                    value={editData.online || ""}
                    onChange={handleEditChange}
                    placeholder="Online"
                  />

                  <input
                    type="number"
                    name="paid"
                    value={editData.paid || ""}
                    onChange={handleEditChange}
                    placeholder="Paid"
                  />

                  <input
                    type="number"
                    name="excess"
                    value={editData.excess || ""}
                    onChange={handleEditChange}
                    placeholder="Excess"
                  />

                  <input
                    type="number"
                    name="grand"
                    value={editData.grand || ""}
                    onChange={handleEditChange}
                    placeholder="Grand Total"
                  />

                  <button className="save-edit-btn" onClick={saveEdit}>
                    Save Changes
                  </button>

                  <button className="cancel-btn" onClick={cancelEdit}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <b>Report #{index + 1}</b>

                  <p>
                    {report.date} - {report.time}
                  </p>

                  <p>
                    <b>Entered By:</b> {report.enteredBy}
                  </p>

                  <p>MS: {report.msLiters} L | ₹{report.msAmount}</p>
                  <p>HSD: {report.hsdLiters} L | ₹{report.hsdAmount}</p>
                  <p>Grand Total: ₹{report.grand}</p>
                  <p>Paid: ₹{report.paid}</p>
                  <p>Excess: ₹{report.excess}</p>

                  <button className="edit-btn" onClick={() => startEdit(report)}>
                    Edit
                  </button>

                  <button
                    className="pdf-btn"
                    onClick={() => downloadSingleReportPDF(report)}
                  >
                    Download PDF
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => deleteReport(report.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
function StaffApproval() {
  const [staffUsers, setStaffUsers] = useState([]);

  const fetchStaff = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const data = [];

      snapshot.forEach((item) => {
        const user = { id: item.id, ...item.data() };

        if (user.role === "staff") {
          data.push(user);
        }
      });

      setStaffUsers(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const approveStaff = async (id) => {
    try {
      await updateDoc(doc(db, "users", id), {
        approved: true,
      });

      alert("Staff approved!");
      fetchStaff();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <h3>Staff Approval</h3>

      <div className="card">
        {staffUsers.map((staff) => (
          <div className="report-item" key={staff.id}>
            <p><b>Name:</b> {staff.name}</p>
            <p><b>Email:</b> {staff.email}</p>

            <p>
              <b>Status:</b>{" "}
              {staff.approved ? "Approved" : "Pending"}
            </p>

            {!staff.approved && (
              <button
                className="save-btn"
                onClick={() => approveStaff(staff.id)}
              >
                Approve Staff
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [salary, setSalary] = useState(15000);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("Present");
  const [staffName, setStaffName] = useState("staff");
const [staffUsers, setStaffUsers] = useState([]);
  const fetchStaffUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    const users = [];

    snapshot.forEach((item) => {
      const user = item.data();

      if (user.role === "staff") {
        users.push(user);
      }
    });

    setStaffUsers(users);
  } catch (error) {
    console.log(error);
  }
};
const fetchAttendance = async () => {
    try {
      const snapshot = await getDocs(collection(db, "attendance"));
      const data = [];

      snapshot.forEach((item) => {
        data.push({
          id: item.id,
          ...item.data(),
        });
      });

      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttendanceRecords(data);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const snapshot = await getDocs(collection(db, "leaveRequests"));
      const data = [];

      snapshot.forEach((item) => {
        data.push({
          id: item.id,
          ...item.data(),
        });
      });

      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLeaveRequests(data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchStaffUsers();
    fetchLeaveRequests();
  }, []);

  const markAttendanceByAdmin = async () => {
    if (!staffName.trim() || !attendanceDate) {
      alert("Enter staff name and date");
      return;
    }

    try {
      await setDoc(doc(db, "attendance", `${staffName}-${attendanceDate}`), {
        staffName,
        date: attendanceDate,
        status: attendanceStatus,
        markedBy: "admin",
        createdAt: new Date().toISOString(),
      });

      alert("Attendance marked!");
      fetchAttendance();
    } catch (error) {
      console.log(error);
      alert("Error marking attendance");
    }
  };

  const updateLeaveStatus = async (leave, status) => {
    try {
      await updateDoc(doc(db, "leaveRequests", leave.id), {
        status,
        reviewedBy: "admin",
        reviewedAt: new Date().toISOString(),
      });

      if (status === "Approved") {
        await setDoc(doc(db, "attendance", `${leave.staffName}-${leave.date}`), {
          staffName: leave.staffName,
          date: leave.date,
          status: "Leave",
          markedBy: "admin",
          createdAt: new Date().toISOString(),
        });
      }

      alert(`Leave ${status}`);
      fetchLeaveRequests();
      fetchAttendance();
    } catch (error) {
      console.log(error);
      alert("Error updating leave");
    }
  };

  const presentDays = attendanceRecords.filter(
    (item) => item.staffName === staffName && item.status === "Present"
  ).length;

  const leaveDays = attendanceRecords.filter(
    (item) => item.staffName === staffName && item.status === "Leave"
  ).length;

  const absentDays = attendanceRecords.filter(
    (item) => item.staffName === staffName && item.status === "Absent"
  ).length;

  const payableSalary = (Number(salary || 0) / 30) * presentDays;

  return (
    <>
      <h3>Staff Attendance & Salary</h3>

      <div className="card">
        <h3>👨‍💼 Manager Attendance Control</h3>

        <select
  value={staffName}
  onChange={(e) => setStaffName(e.target.value)}
>
  <option value="">Select Staff</option>

  {staffUsers.map((staff, index) => (
    <option key={index} value={staff.name}>
      {staff.name}
    </option>
  ))}
</select>
        <input
          type="date"
          value={attendanceDate}
          onChange={(e) => setAttendanceDate(e.target.value)}
        />

        <select
          value={attendanceStatus}
          onChange={(e) => setAttendanceStatus(e.target.value)}
        >
          <option>Present</option>
          <option>Absent</option>
          <option>Leave</option>
        </select>

        <button className="save-btn" onClick={markAttendanceByAdmin}>
          Mark Attendance
        </button>

        <input
          type="number"
          placeholder="Monthly Salary"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />

        <p><b>Present Days:</b> {presentDays}</p>
        <p><b>Leave Days:</b> {leaveDays}</p>
        <p><b>Absent Days:</b> {absentDays}</p>
        <p><b>Payable Salary:</b> ₹{payableSalary.toFixed(2)}</p>
      </div>

      <div className="card">
        <h3>📝 Leave Requests</h3>

        {leaveRequests.length === 0 ? (
          <p>No leave requests.</p>
        ) : (
          leaveRequests.map((leave) => (
            <div className="report-item" key={leave.id}>
              <p><b>Staff:</b> {leave.staffName}</p>
              <p><b>Date:</b> {leave.date}</p>
              <p><b>Reason:</b> {leave.reason}</p>
              <p><b>Status:</b> {leave.status}</p>

              {leave.status === "Pending" && (
                <>
                  <button
                    className="save-btn"
                    onClick={() => updateLeaveStatus(leave, "Approved")}
                  >
                    Approve
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => updateLeaveStatus(leave, "Rejected")}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>📅 Attendance Records</h3>

        {attendanceRecords.length === 0 ? (
          <p>No attendance marked yet.</p>
        ) : (
          attendanceRecords.map((item) => (
            <div className="report-item" key={item.id}>
              <p><b>Staff:</b> {item.staffName}</p>
              <p><b>Date:</b> {item.date}</p>
              <p><b>Status:</b> {item.status}</p>
              <p><b>Marked By:</b> {item.markedBy}</p>
            </div>
          ))
        )}
      </div>
    </>
  );
}


function extractVtotValues(text) {
  // Receipts print Vtot once in the main totalizer section and again
  // in the nozzle section. Keep the first two distinct readings.
  const normalizedText = String(text || '').replace(/\s+/g, ' ');
  const patterns = [
    /V\s*tot\s*[:.]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi,
    /Vtot\s*[:.]?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi,
  ];
  const values = [];
  for (const pattern of patterns) {
    for (const match of normalizedText.matchAll(pattern)) {
      const value = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0 &&
          !values.some((existing) => Math.abs(existing - value) < 0.01)) {
        values.push(value);
      }
    }
  }
  return values;
}

function identifyPump(text, fileName = '') {
  const raw = `${text || ''} ${fileName || ''}`.toUpperCase();
  const compact = raw.replace(/[^A-Z0-9]/g, '');

  // Exact DU serials printed on the station receipts.
  if (compact.includes('M2519363') || compact.includes('2519363')) return 'pump1';
  if (compact.includes('M2519364') || compact.includes('2519364')) return 'pump2';

  // OCR commonly confuses 0/O, 1/I/L and 5/S. Compare a serial-like
  // seven-character sequence with the two known DU serials (one typo allowed).
  const serialCandidates = [...raw.matchAll(/M\s*([0-9OQILSZB]{7})/g)]
    .map((match) => match[1]
      .replace(/[OQ]/g, '0')
      .replace(/[IL|]/g, '1')
      .replace(/S/g, '5')
      .replace(/Z/g, '2')
      .replace(/B/g, '8'));

  const distance = (a, b) => {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const old = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = old;
      }
    }
    return row[b.length];
  };

  for (const candidate of serialCandidates) {
    if (distance(candidate, '2519363') <= 1) return 'pump1';
    if (distance(candidate, '2519364') <= 1) return 'pump2';
  }

  if (/PUMP[\s_-]*1/i.test(raw)) return 'pump1';
  if (/PUMP[\s_-]*2/i.test(raw)) return 'pump2';
  return null;
}


function AIAnalyzer() {
  const [yesterdayFiles, setYesterdayFiles] = useState([]);
  const [todayFiles, setTodayFiles] = useState([]);
  const [readings, setReadings] = useState({
    hsd1: { yesterday: "", today: "" },
    ms1: { yesterday: "", today: "" },
    hsd2: { yesterday: "", today: "" },
    ms2: { yesterday: "", today: "" },
  });

  const [rates, setRates] = useState({
    ms: "109.24",
    hsd: "95.50",
  });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const nozzleInfo = [
    { key: "hsd1", label: "Pump 1 (M2519363) - Nozzle 1", product: "HSD" },
    { key: "ms1", label: "Pump 1 (M2519363) - Nozzle 2", product: "MS" },
    { key: "hsd2", label: "Pump 2 (M2519364) - Nozzle 1", product: "HSD" },
    { key: "ms2", label: "Pump 2 (M2519364) - Nozzle 2", product: "MS" },
  ];

  const handleFiles = (event, day) => {
    const selected = Array.from(event.target.files || []);
    const valid = selected.filter(file => file.type.startsWith("image/"));

    if (valid.length !== selected.length) {
      setError("Only image files are allowed.");
    } else {
      setError("");
    }

    if (day === "yesterday") {
      setYesterdayFiles(prev => [...prev, ...valid].slice(0, 6));
    } else {
      setTodayFiles(prev => [...prev, ...valid].slice(0, 6));
    }

    event.target.value = "";
  };

  const removeFile = (day, index) => {
    if (day === "yesterday") {
      setYesterdayFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setTodayFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const analyzeFiles = async () => {
    if (!yesterdayFiles.length || !todayFiles.length) {
      setError("Please upload at least one image for both days.");
      return;
    }

    const formData = new FormData();

    yesterdayFiles.forEach(file => {
      formData.append("yesterday", file);
    });

    todayFiles.forEach(file => {
      formData.append("today", file);
    });

    try {
      setLoading(true);
      setError("");
      setWarnings([]);
      setProgress("Sending images to Gemini AI...");

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const response = await fetch(
  `${API_BASE_URL}/api/analyze-receipts`,
  {
    method: "POST",
    body: formData,
  }
);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gemini analysis failed.");
      }

      if (!Array.isArray(result.differences)) {
        throw new Error("The server did not return fuel differences.");
      }

      const updatedReadings = {
        hsd1: { yesterday: "", today: "" },
        ms1: { yesterday: "", today: "" },
        hsd2: { yesterday: "", today: "" },
        ms2: { yesterday: "", today: "" },
      };

      result.differences.forEach(item => {
        const pump = String(item.duSerial || "").toUpperCase();
        const nozzle = Number(item.nozzleNumber);

        let key = null;

        if (pump.includes("2519363") && nozzle === 1) key = "hsd1";
        if (pump.includes("2519363") && nozzle === 2) key = "ms1";
        if (pump.includes("2519364") && nozzle === 1) key = "hsd2";
        if (pump.includes("2519364") && nozzle === 2) key = "ms2";

        if (key) {
          updatedReadings[key] = {
            yesterday: String(item.yesterdayVtot ?? ""),
            today: String(item.todayVtot ?? ""),
          };
        }
      });

      setReadings(updatedReadings);
      setWarnings(result.warnings || []);

      const filledCount = Object.values(updatedReadings).filter(
        item => item.yesterday !== "" && item.today !== ""
      ).length;

      if (filledCount === 4) {
        setProgress("Gemini successfully analyzed the receipts. All four nozzle readings were matched.");
        setError("");
      } else {
        setProgress(`${filledCount} of 4 nozzle readings matched.`);
        setError("Some readings could not be matched. Check the uploaded images and warnings below.");
      }
    } catch (err) {
      console.error("Gemini analysis error:", err);
      setError(
        err.message ||
        "Unable to connect to Gemini. Check that your server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const difference = key => {
    const yesterday = readings[key].yesterday;
    const today = readings[key].today;

    if (yesterday === "" || today === "") return null;

    const result = Number(today) - Number(yesterday);

    return Number.isFinite(result) ? result : null;
  };

  const rows = nozzleInfo.map(item => ({
    ...item,
    difference: difference(item.key),
  }));

  const hsdLitres = rows
    .filter(item => item.product === "HSD")
    .reduce(
      (sum, item) =>
        sum + (item.difference !== null && item.difference >= 0
          ? item.difference
          : 0),
      0
    );

  const msLitres = rows
    .filter(item => item.product === "MS")
    .reduce(
      (sum, item) =>
        sum + (item.difference !== null && item.difference >= 0
          ? item.difference
          : 0),
      0
    );

  const hsdAmount = hsdLitres * Number(rates.hsd || 0);
  const msAmount = msLitres * Number(rates.ms || 0);

  const complete = rows.every(item => item.difference !== null);
  const hasNegative = rows.some(
    item => item.difference !== null && item.difference < 0
  );

  const clearAll = () => {
    setYesterdayFiles([]);
    setTodayFiles([]);
    setReadings({
      hsd1: { yesterday: "", today: "" },
      ms1: { yesterday: "", today: "" },
      hsd2: { yesterday: "", today: "" },
      ms2: { yesterday: "", today: "" },
    });
    setProgress("");
    setError("");
    setWarnings([]);
  };

  const uploadSection = (day, files) => (
    <div className="analyzer-upload-section">
      <h3>
        {day === "yesterday" ? "Yesterday's Images" : "Today's Images"}
      </h3>

      <p>Upload all pump totalizer receipts or screenshots.</p>

      <label className="analyzer-upload-box">
        <span>＋</span>
        <b>Choose multiple images</b>
        <small>JPG, PNG or other image formats</small>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={event => handleFiles(event, day)}
        />
      </label>

      {files.map((file, index) => (
        <div className="analyzer-file-item" key={`${file.name}-${index}`}>
          <span>🖼 {file.name}</span>
          <button
            type="button"
            onClick={() => removeFile(day, index)}
          >
            Remove
          </button>
        </div>
      ))}

      <p className="analyzer-file-count">
        {files.length} image(s) selected
      </p>
    </div>
  );

  return (
    <div className="analyzer-page">
      <div className="page-intro">
        <h2>AI Fuel Reading Analyzer</h2>
        <p>
          Upload yesterday's and today's pump receipts.
          Gemini AI reads the Vtot values and calculates fuel differences automatically.
        </p>
      </div>

      <div className="card">
        <h3>01. Upload Pump Images</h3>

        <div className="analyzer-upload-grid">
          {uploadSection("yesterday", yesterdayFiles)}
          {uploadSection("today", todayFiles)}
        </div>

        <div className="button-row">
          <button
            className="primary-btn"
            onClick={analyzeFiles}
            disabled={loading}
          >
            {loading ? "Gemini is analyzing..." : "✦ Analyze All Images"}
          </button>

          <button onClick={clearAll}>Clear All</button>
        </div>

        {progress && <p className="analyzer-progress">{progress}</p>}
        {error && <p className="error-message">{error}</p>}

        {warnings.length > 0 && (
          <div className="analyzer-note">
            <b>Gemini warnings:</b>
            {warnings.map((warning, index) => (
              <p key={index}>{String(warning)}</p>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>02. Automatically Detected Totalizer Readings</h3>

        <p>
          These values are filled by Gemini. You do not need to enter them manually.
        </p>

        <div className="table-container">
          <table className="analyzer-table">
            <thead>
              <tr>
                <th>Pump / Nozzle</th>
                <th>Product</th>
                <th>Yesterday Vtot</th>
                <th>Today Vtot</th>
                <th>Difference (L)</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(item => (
                <tr key={item.key}>
                  <td>{item.label}</td>
                  <td>{item.product}</td>
                  <td>{readings[item.key].yesterday || "Not detected"}</td>
                  <td>{readings[item.key].today || "Not detected"}</td>
                  <td>
                    {item.difference === null
                      ? "—"
                      : `${item.difference.toFixed(2)} L`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasNegative && (
          <p className="error-message">
            A current Vtot is lower than yesterday's reading. Check for a meter reset or incorrect matching.
          </p>
        )}
      </div>

      <div className="card">
        <h3>03. Fuel Rates</h3>

        <div className="form-grid">
          <div>
            <label>MS Petrol Rate (₹/L)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rates.ms}
              onChange={e => setRates(prev => ({
                ...prev,
                ms: e.target.value,
              }))}
            />
          </div>

          <div>
            <label>HSD Diesel Rate (₹/L)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rates.hsd}
              onChange={e => setRates(prev => ({
                ...prev,
                hsd: e.target.value,
              }))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>04. Final Fuel Summary</h3>

        {!complete && (
          <p className="analyzer-note">
            Upload clear receipts for both days to complete all four nozzle calculations.
          </p>
        )}

        <div className="dashboard-grid">
          <div className="dash-card">
            <span>Total HSD Diesel</span>
            <b>{hsdLitres.toFixed(2)} L</b>
            <small>₹{hsdAmount.toFixed(2)}</small>
          </div>

          <div className="dash-card">
            <span>Total MS Petrol</span>
            <b>{msLitres.toFixed(2)} L</b>
            <small>₹{msAmount.toFixed(2)}</small>
          </div>

          <div className="dash-card">
            <span>Combined Total</span>
            <b>{(hsdLitres + msLitres).toFixed(2)} L</b>
            <small>₹{(hsdAmount + msAmount).toFixed(2)}</small>
          </div>
        </div>

        <p className="analyzer-note">
          Check the detected Vtot values against the original receipts before using these totals for station records.
        </p>
      </div>
    </div>
  );
}



function ProtectedRoute({ isLoggedIn, role, allowedRoles, children }) {
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(role)) return <Navigate to="/tracker" replace />;
  return children;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  );

  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [reports, setReports] = useState([]);

  const fetchReports = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "reports"));

      const firebaseReports = [];

      querySnapshot.forEach((firebaseDoc) => {
        firebaseReports.push({
          id: firebaseDoc.id,
          ...firebaseDoc.data(),
        });
      });

      firebaseReports.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      setReports(firebaseReports);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
  if (isLoggedIn) {
    fetchReports();
  } else {
    setReports([]);
  }
}, [isLoggedIn]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} setRole={setRole} />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              role={role}
              allowedRoles={["admin", "staff"]}
            >
              <Layout
                role={role}
                setIsLoggedIn={setIsLoggedIn}
                setRole={setRole}
              >
                <Dashboard reports={reports} />
              </Layout>
            </ProtectedRoute>
          }
        />
<Route
  path="/calculator"
  element={
    <ProtectedRoute
      isLoggedIn={isLoggedIn}
      role={role}
      allowedRoles={["admin", "staff"]}
    >
      <Layout
        role={role}
        setIsLoggedIn={setIsLoggedIn}
        setRole={setRole}
      >
        <CalculatorPage />
      </Layout>
    </ProtectedRoute>
  }
/>
        <Route
          path="/tracker"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              role={role}
              allowedRoles={["admin", "staff"]}
            >
              <Layout
                role={role}
                setIsLoggedIn={setIsLoggedIn}
                setRole={setRole}
              >
                <Tracker fetchReports={fetchReports} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              role={role}
              allowedRoles={["admin", "staff"]}
            >
              <Layout
                role={role}
                setIsLoggedIn={setIsLoggedIn}
                setRole={setRole}
              >
                <Reports reports={reports} setReports={setReports} />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute
              isLoggedIn={isLoggedIn}
              role={role}
              allowedRoles={["admin", "staff"]}
            >
              <Layout
                role={role}
                setIsLoggedIn={setIsLoggedIn}
                setRole={setRole}
              >
                <Attendance />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/ai-analyzer" element={<ProtectedRoute isLoggedIn={isLoggedIn} role={role} allowedRoles={["admin", "staff"]}><Layout role={role} setIsLoggedIn={setIsLoggedIn} setRole={setRole}><AIAnalyzer /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;