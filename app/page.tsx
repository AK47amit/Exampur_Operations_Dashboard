"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  IndianRupee as CircleIndianRupee,
  Clock3,
  Download,
  IdCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic,
  Eye,
  EyeOff,
  ImagePlus,
  MessageCircle,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  ScanLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

const SESSION_KEY = "exampur_staff_v6";
const BATCHES = ["UPSI", "UPP", "SSC", "Railway", "SuperTET"];
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type Role = "Admin" | "Super Admin" | "Counselor" | "Batch Checker";
type Tab =
  | "overview"
  | "students"
  | "idcards"
  | "counselors"
  | "counselorcard"
  | "checker"
  | "timetable"
  | "attendance"
  | "fees"
  | "access";
type StaffSession = {
  name: string;
  mobile: string;
  email: string;
  role: Role;
  status: string;
  counselorId?: string;
  authToken?: string;
  photoUrl?: string;
};
type StaffRequest = {
  requestedAt: string;
  approvedAt?: string;
  name: string;
  mobile: string;
  email: string;
  requestedRole: Role;
  approvedRole?: Role;
  status: string;
  approvedBy?: string;
  active?: boolean;
  counselorId?: string;
  joiningDate?: string;
  designation?: string;
  photoUrl?: string;
};
type Counselor = StaffRequest & { counselorId: string };
type Student = {
  studentId: string;
  registrationNo: string;
  studentName: string;
  mobile: string;
  whatsappNumber?: string;
  fatherName?: string;
  course: string;
  batch: string;
  paidFee: number;
  pendingFee: number;
  totalFee: number;
  nextDueDate: string;
  photoUrl?: string;
  active?: boolean;
  approvalStatus?: string;
  loginEnabled?: boolean;
  counselorEmail?: string;
  discount?: number;
  oldStudent?: string;
  inquiryId?: string;
  courseFee?: number;
  booksAllowed?: boolean;
  booksAllotted?: boolean;
  booksAllottedAt?: string;
};
type Inquiry = {
  roughRegistrationNo: string;
  studentName: string;
  mobile: string;
  fatherName?: string;
  course: string;
  batch?: string;
  counselorEmail?: string;
  status: string;
  createdAt?: string;
  inquiryDate?: string;
  notes?: string;
  source?: string;
  followUpDate?: string;
};
type Attendance = {
  time: string;
  studentId: string;
  studentName: string;
  batch: string;
  checkerEmail: string;
  status?: string;
  scanMethod?: string;
};
type TimeSlot = {
  timetableId?: string;
  batch: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  room: string;
  classStatus: string;
  isCancelled?: boolean;
};
type Dashboard = {
  approvedStudents: number;
  presentStudents: number;
  todayCollection: number;
  pendingFee: number;
  todayInquiries: number;
  todayAdmissions: number;
  totalCounselors?: number;
  pendingStaffApprovals?: number;
  batchCounts: Record<string, number>;
  collectionTrend?: { day: string; collection: number }[];
};
type ActivityItem = { id: string; time: string; text: string };
const initialDashboard: Dashboard = {
  approvedStudents: 0,
  presentStudents: 0,
  todayCollection: 0,
  pendingFee: 0,
  todayInquiries: 0,
  todayAdmissions: 0,
  totalCounselors: 0,
  pendingStaffApprovals: 0,
  batchCounts: {},
};

const money = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const studentPhotoKey = (studentId: string) =>
  `exampur_student_photo_${studentId}`;
function resizeStudentPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const photo = new window.Image();
    photo.onload = () => {
      const canvas = document.createElement("canvas");
      const targetWidth = 420,
        targetHeight = 520,
        targetRatio = targetWidth / targetHeight;
      const sourceRatio = photo.width / photo.height;
      let sx = 0,
        sy = 0,
        sw = photo.width,
        sh = photo.height;
      if (sourceRatio > targetRatio) {
        sw = photo.height * targetRatio;
        sx = (photo.width - sw) / 2;
      } else {
        sh = photo.width / targetRatio;
        sy = (photo.height - sh) / 2;
      }
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas
        .getContext("2d")
        ?.drawImage(photo, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(objectUrl);
      let quality = 0.8;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > 46000 && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      if (result.length > 46000) {
        const compact = document.createElement("canvas");
        compact.width = 210;
        compact.height = 260;
        compact.getContext("2d")?.drawImage(canvas, 0, 0, 210, 260);
        result = compact.toDataURL("image/jpeg", 0.55);
      }
      resolve(result);
    };
    photo.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image read नहीं हुई। दूसरी photo try करें।"));
    };
    photo.src = objectUrl;
  });
}
async function api(
  action: string,
  data: Record<string, unknown> = {},
  timeout = 9000,
) {
  const publicActions = new Set([
    "health",
    "requestStaff",
    "loginStaff",
    "getStaffAccess",
    "studentAccessByToken",
    "verifyStudentMobile",
    "bindStudentDevice",
    "updateStudentPhoto",
    "registerStudent",
    "loginStudent",
  ]);
  let session: StaffSession | null = null;
  try {
    session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {}
  const payload = publicActions.has(action)
    ? { action, ...data }
    : {
        action,
        ...data,
        authToken: data.authToken || session?.authToken || "",
      };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch("/api/exampur", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      const message =
        result.error || result.message || "Request could not be completed.";
      if (/session expired|login required/i.test(message)) {
        localStorage.removeItem(SESSION_KEY);
        window.dispatchEvent(new Event("exampur-session-expired"));
      }
      throw new Error(message);
    }
    return result;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("Request timed out. Please retry.");
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "compact" : ""}`}>
      <span
        className="brand-mark"
        role="img"
        aria-label="EXAMPUR official logo"
      />
      <span className="brand-word">
        EXAMPUR <span>Offline</span>
      </span>
    </div>
  );
}

const roleChoices: { role: Role; title: string; description: string }[] = [
  {
    role: "Counselor",
    title: "Counselor",
    description: "Admissions, students और fee follow-up",
  },
  {
    role: "Batch Checker",
    title: "Batch Checker",
    description: "QR attendance, batches और timetable",
  },
  {
    role: "Admin",
    title: "Admin",
    description: "Approvals, reports और centre control",
  },
  {
    role: "Super Admin",
    title: "Super Admin",
    description: "Complete operations और management access",
  },
];

function Login({ onLogin }: { onLogin: (session: StaffSession) => void }) {
  const [mode, setMode] = useState<"signin" | "roles" | "register">("signin");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    role: "Counselor" as Role,
    photoUrl: "",
  });
  const staffPhotoRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function signIn() {
    if (!login.email.includes("@") || login.password.length < 6)
      return setError("सही email और password enter करें।");
    setBusy(true);
    setError("");
    try {
      const result = await api(
        "loginStaff",
        { email: login.email.trim().toLowerCase(), password: login.password },
        12000,
      );
      if (result.status !== "Approved" || result.active === false)
        throw new Error(
          result.status === "Pending"
            ? "आपकी request अभी approval pending है।"
            : "इस account का access active नहीं है।",
        );
      const session: StaffSession = {
        name: result.name || "EXAMPUR Staff",
        mobile: result.mobile || "",
        email: result.email || login.email.trim().toLowerCase(),
        role: result.role as Role,
        status: "Approved",
        counselorId: result.counselorId || "",
        authToken: result.authToken || "",
        photoUrl: result.photoUrl || "",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login नहीं हुआ।");
    } finally {
      setBusy(false);
    }
  }
  async function register() {
    const mobile = form.mobile.replace(/\D/g, ""),
      email = form.email.trim().toLowerCase();
    if (
      !form.name.trim() ||
      !/^\d{10}$/.test(mobile) ||
      !email.includes("@") ||
      form.password.length < 6 ||
      !form.photoUrl
    )
      return setError(
        "नाम, 10 digit mobile, सही email, password और profile photo भरें।",
      );
    setBusy(true);
    setError("");
    try {
      const result = await api(
        "requestStaff",
        { ...form, email, mobile },
        12000,
      );
      const session: StaffSession = {
        name: form.name.trim(),
        mobile,
        email,
        role: form.role,
        status:
          result.status === "Approved" ? "Pending" : result.status || "Pending",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request send नहीं हुई।");
    } finally {
      setBusy(false);
    }
  }
  async function captureStaffPhoto(file?: File) {
    if (!file) return;
    setError("");
    try {
      const photoUrl = await resizeStudentPhoto(file);
      if (photoUrl.length > 48000) throw new Error("Photo size is too large.");
      setForm((current) => ({ ...current, photoUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo capture failed.");
    }
  }
  const formContent =
    mode === "signin" ? (
      <div className="login-form-card signin-card">
        <div className="mobile-brand">
          <Brand compact />
        </div>
        <span className="eyebrow dark">
          <Zap size={14} /> Secure Staff Login
        </span>
        <h2>Sign in</h2>
        <div className="form-grid one">
          <label>
            Email address
            <input
              value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })}
              type="email"
              placeholder="name@exampur.com"
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
              />
              <button
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="primary-action" onClick={signIn} disabled={busy}>
          {busy ? (
            <RefreshCw className="spin" size={18} />
          ) : (
            <ShieldCheck size={18} />
          )}{" "}
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <p className="register-link">
          First time user?{" "}
          <button
            onClick={() => {
              setMode("roles");
              setError("");
            }}
          >
            Register here
          </button>
        </p>
      </div>
    ) : mode === "roles" ? (
      <div className="login-form-card join-card">
        <div className="mobile-brand">
          <Brand compact />
        </div>
        <button
          className="back-action"
          onClick={() => {
            setMode("signin");
            setError("");
          }}
        >
          <ArrowLeft size={17} /> Back to sign in
        </button>
        <span className="eyebrow dark">JOIN OUR TEAM</span>
        <h2>Select your role</h2>
        <p className="form-intro">
          जिस work के लिए access चाहिए, वही role select करें।
        </p>
        <div className="role-options">
          {roleChoices.map((item) => (
            <button
              key={item.role}
              className={form.role === item.role ? "active" : ""}
              onClick={() => setForm({ ...form, role: item.role })}
            >
              <i>{form.role === item.role && <span />}</i>
              <span>
                <b>{item.title}</b>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </div>
        <button
          className="primary-action"
          onClick={() => {
            setMode("register");
            setError("");
          }}
        >
          Continue with {form.role}
        </button>
      </div>
    ) : (
      <div className="login-form-card register-card">
        <div className="mobile-brand">
          <Brand compact />
        </div>
        <button
          className="back-action"
          onClick={() => {
            setMode("roles");
            setError("");
          }}
        >
          <ArrowLeft size={17} /> Change role
        </button>
        <span className="eyebrow dark">{form.role.toUpperCase()} ACCESS</span>
        <h2>Create account</h2>
        <p className="form-intro">Details भरकर admin approval request भेजें।</p>
        <div className="form-grid one">
          <label>
            Full name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
          </label>
          <label>
            Mobile number
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              inputMode="numeric"
              placeholder="10 digit mobile"
            />
          </label>
          <label>
            Email address
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              placeholder="name@exampur.com"
            />
          </label>
          <label>
            Create password
            <div className="password-field">
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 6 characters"
              />
              <button
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>
          <label>
            Profile photo *
            <input
              ref={staffPhotoRef}
              className="photo-file-input"
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => void captureStaffPhoto(e.target.files?.[0])}
            />
            <button
              type="button"
              className="mini-action"
              onClick={() => staffPhotoRef.current?.click()}
            >
              <Camera size={17} />{" "}
              {form.photoUrl ? "Retake profile photo" : "Capture profile photo"}
            </button>
          </label>
        </div>
        {error && <div className="alert error">{error}</div>}
        <button className="primary-action" onClick={register} disabled={busy}>
          {busy ? (
            <RefreshCw className="spin" size={18} />
          ) : (
            <UserCheck size={18} />
          )}{" "}
          {busy ? "Sending request..." : "Send approval request"}
        </button>
      </div>
    );
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-glow" />
        <Brand />
        <div className="login-workspace">
          <span className="eyebrow">
            <Sparkles size={15} /> PRAYAGRAJ OFFLINE CENTRE
          </span>
          <h1>
            One team.
            <br />
            Right access.
            <br />
            <em>Clear work.</em>
          </h1>
          <div className="workspace-flow">
            <div>
              <i>1</i>
              <span>
                <b>Register</b>
                <small>Select work role</small>
              </span>
            </div>
            <div>
              <i>2</i>
              <span>
                <b>Get approved</b>
                <small>Admin verifies request</small>
              </span>
            </div>
            <div>
              <i>3</i>
              <span>
                <b>Start work</b>
                <small>Open assigned dashboard</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="login-form-wrap">{formContent}</section>
    </main>
  );
}

function PendingApproval({
  session,
  logout,
}: {
  session: StaffSession;
  logout: () => void;
}) {
  const [status, setStatus] = useState(session.status || "Pending"),
    [checking, setChecking] = useState(false),
    [message, setMessage] = useState(
      "Admin dashboard पर request भेज दी गई है।",
    );
  const check = useCallback(async () => {
    setChecking(true);
    try {
      const result = await api("getStaffAccess", { email: session.email });
      const nextStatus = result.status || "Pending";
      setStatus(nextStatus);
      if (nextStatus === "Approved" && result.active !== false) {
        setMessage(
          "Admin ने access approve कर दिया है। अब अपने email और password से sign in करें।",
        );
        return;
      }
      setMessage(
        nextStatus === "Rejected"
          ? "Request reject हो गई है। Admin से संपर्क करें।"
          : nextStatus === "On Hold"
            ? "Request अभी hold पर है।"
            : "Request send हो गई है। Admin approval का इंतज़ार है।",
      );
    } catch {
      setMessage("Approval service से connection check हो रहा है।");
    } finally {
      setChecking(false);
    }
  }, [session.email]);
  useEffect(() => {
    const first = window.setTimeout(() => {
      void check();
    }, 800);
    const timer = window.setInterval(() => {
      void check();
    }, 5000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [check]);
  return (
    <main className="approval-page">
      <div className="approval-card">
        <Brand />
        <div
          className={`approval-orbit ${status.toLowerCase().replace(" ", "-")}`}
        >
          <ShieldCheck size={42} />
          <i />
          <i />
          <i />
        </div>
        <span className="eyebrow dark">ACCESS REQUEST</span>
        <h1>
          {status === "Approved"
            ? "Access approved"
            : status === "Rejected"
              ? "Request rejected"
              : "Approval pending"}
        </h1>
        <p>{message}</p>
        <div className="approval-meta">
          <span>
            Requested role<b>{session.role}</b>
          </span>
          <span>
            Live status
            <b>
              <i /> {status}
            </b>
          </span>
        </div>
        {status === "Approved" ? (
          <button className="primary-action" onClick={logout}>
            <ShieldCheck size={18} /> Sign in now
          </button>
        ) : (
          <button
            className="primary-action"
            onClick={check}
            disabled={checking}
          >
            {checking ? (
              <RefreshCw className="spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}{" "}
            Check approval
          </button>
        )}
        <button className="text-action" onClick={logout}>
          Use another account
        </button>
      </div>
    </main>
  );
}

const navItems: {
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[];
}[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  {
    id: "students",
    label: "Student Admission",
    icon: Users,
    roles: ["Admin", "Super Admin", "Counselor"],
  },
  {
    id: "idcards",
    label: "Student ID Card",
    icon: IdCard,
    roles: ["Admin", "Super Admin", "Counselor"],
  },
  { id: "checker", label: "Student ID Checker", icon: ShieldCheck },
  {
    id: "counselors",
    label: "Counsellors",
    icon: Users,
    roles: ["Admin", "Super Admin"],
  },
  {
    id: "timetable",
    label: "Timetable",
    icon: CalendarDays,
    roles: ["Admin", "Super Admin", "Batch Checker"],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: UserCheck,
    roles: ["Admin", "Super Admin", "Batch Checker"],
  },
  {
    id: "fees",
    label: "Fees & Dues",
    icon: WalletCards,
    roles: ["Admin", "Super Admin", "Counselor"],
  },
  {
    id: "access",
    label: "Counsellor Approvals",
    icon: UserCheck,
    roles: ["Admin", "Super Admin"],
  },
];

function Sidebar({
  active,
  setActive,
  session,
  open,
  close,
  logout,
  askAI,
}: {
  active: Tab;
  setActive: (tab: Tab) => void;
  session: StaffSession;
  open: boolean;
  close: () => void;
  logout: () => void;
  askAI: () => void;
}) {
  const allowed = navItems.filter(
    (item) => !item.roles || item.roles.includes(session.role),
  );
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <button className="sidebar-close" onClick={close}>
        <X size={20} />
      </button>
      <div className="sidebar-brand">
        <Brand />
        <small>PRAYAGRAJ CENTRE</small>
      </div>
      <nav>
        <span className="nav-heading">CONTROL CENTRE</span>
        {allowed.map((item) => (
          <button
            key={item.id}
            className={active === item.id ? "active" : ""}
            onClick={() => {
              setActive(item.id);
              close();
            }}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
            {active === item.id && <i />}
          </button>
        ))}
      </nav>
      <div className="support-card">
        <span>
          <Sparkles size={16} />
        </span>
        <b>Centre AI</b>
        <small>आज की report instantly पूछें</small>
        <button onClick={askAI}>Ask now</button>
      </div>
      <div className="sidebar-user">
        <div
          className="avatar"
          style={
            session.photoUrl
              ? {
                  backgroundImage: `url(${session.photoUrl})`,
                  backgroundSize: "cover",
                }
              : undefined
          }
        >
          {!session.photoUrl && initials(session.name)}
        </div>
        <div>
          <b>{session.name}</b>
          <small>{session.role}</small>
        </div>
        <button onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
function Header({
  session,
  menu,
  sync,
  live,
  lastSynced,
  notifications,
}: {
  session: StaffSession;
  menu: () => void;
  sync: () => void;
  live: boolean;
  lastSynced: string;
  notifications: string[];
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-button" onClick={menu}>
          <Menu size={21} />
        </button>
        <div>
          <p>Good afternoon, {session.name.split(" ")[0]} 👋</p>
          <small>Here&apos;s what&apos;s happening at your centre today.</small>
        </div>
      </div>
      <div className="topbar-actions">
        <div className={`live-pill ${live ? "" : "demo"}`}>
          <span />
          {live ? `Sheet live${lastSynced ? ` · ${lastSynced}` : ""}` : "Sync issue"}
        </div>
        <button onClick={sync} title="Refresh live data">
          <RefreshCw size={19} />
        </button>
        <button
          className="notification"
          onClick={() =>
            window.alert(
              notifications.length
                ? notifications.map((item, index) => `${index + 1}. ${item}`).join("\n")
                : "कोई नई notification नहीं है।",
            )
          }
          title="Notifications"
        >
          <Bell size={19} />
          {notifications.length > 0 && <i>{notifications.length}</i>}
        </button>
        <div className="profile-chip">
          <div
            className="avatar"
            style={
              session.photoUrl
                ? {
                    backgroundImage: `url(${session.photoUrl})`,
                    backgroundSize: "cover",
                  }
                : undefined
            }
          >
            {!session.photoUrl && initials(session.name)}
          </div>
          <div>
            <b>{session.name}</b>
            <small>{session.role}</small>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
}
function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={21} />
      </div>
      <div className="stat-copy">
        <span>{label}</span>
        <b>{value}</b>
        <small>{note}</small>
      </div>
      <div className="stat-spark">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
    </article>
  );
}

function Overview({
  dashboard,
  students,
  attendance,
  setActive,
  selectStudent,
  attendanceRate,
  pendingAdmissions,
  activities,
}: {
  dashboard: Dashboard;
  students: Student[];
  attendance: Attendance[];
  setActive: (tab: Tab) => void;
  selectStudent: (student: Student) => void;
  attendanceRate: number;
  pendingAdmissions: number;
  activities: ActivityItem[];
}) {
  const batchData = BATCHES.map((batch) => ({
    name: batch,
    value: dashboard.batchCounts?.[batch] || 0,
  }));
  const total = batchData.reduce((sum, item) => sum + item.value, 0) || 1;
  const chartData = dashboard.collectionTrend || [];
  const colors = ["#5b46e8", "#1f9d71", "#ff9f43", "#2d79eb", "#ea5b87"];
  const localDate = (date: Date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  };
  const today = localDate(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDate(tomorrowDate);
  const dues = students.filter(
    (student) => student.pendingFee > 0 && student.nextDueDate,
  );
  const dueGroups = [
    {
      label: "Overdue",
      tone: "red",
      rows: dues.filter(
        (student) => String(student.nextDueDate).slice(0, 10) < today,
      ),
    },
    {
      label: "Due today",
      tone: "orange",
      rows: dues.filter(
        (student) => String(student.nextDueDate).slice(0, 10) === today,
      ),
    },
    {
      label: "Due tomorrow",
      tone: "purple",
      rows: dues.filter(
        (student) => String(student.nextDueDate).slice(0, 10) === tomorrow,
      ),
    },
    {
      label: "Upcoming dues",
      tone: "green",
      rows: dues.filter(
        (student) => String(student.nextDueDate).slice(0, 10) > tomorrow,
      ),
    },
  ];
  return (
    <div className="tab-stack">
      <section className="hero-banner">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> SMART CENTRE MANAGEMENT
          </span>
          <h1>Everything under control.</h1>
          <p>
            Today&apos;s admissions, attendance and collections are synced in
            one clear view.
          </p>
          <div className="hero-actions">
            <button onClick={() => setActive("checker")}>
              <ScanLine size={18} /> Scan student ID
            </button>
            <button onClick={() => setActive("students")}>
              <Users size={18} /> View students
            </button>
          </div>
        </div>
        <div className="hero-mentor" role="img" aria-label="Vivek Sir">
          <div>
            <b>Vivek Sir</b>
            <span>Welcome to EXAMPUR</span>
          </div>
        </div>
      </section>
      <section className="stats-grid">
        <StatCard
          label="Total Students"
          value={dashboard.approvedStudents.toLocaleString("en-IN")}
          note={(dashboard.todayAdmissions || 0) + " admitted today"}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Present Today"
          value={dashboard.presentStudents.toLocaleString("en-IN")}
          note={`${attendanceRate}% of active students`}
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          label="Today Collection"
          value={money(dashboard.todayCollection)}
          note="From recorded fee entries"
          icon={CircleIndianRupee}
          tone="purple"
        />
        <StatCard
          label="Pending Fee"
          value={money(dashboard.pendingFee)}
          note="Current student dues"
          icon={WalletCards}
          tone="orange"
        />
        <StatCard
          label="Counsellors"
          value={String(dashboard.totalCounselors || 0)}
          note="Approved counsellor accounts"
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Admission Approvals"
          value={String(pendingAdmissions)}
          note="Student registrations pending"
          icon={UserCheck}
          tone="orange"
        />
      </section>
      <section className="panel fee-due-board">
        <div className="panel-head">
          <div>
            <span>FEE FOLLOW-UP</span>
            <h3>Today, overdue & upcoming dues</h3>
          </div>
          <button onClick={() => setActive("fees")}>Open fees</button>
        </div>
        <div className="fee-due-groups">
          {dueGroups.map((group) => (
            <article
              key={group.label}
              className={`fee-due-group ${group.tone}`}
            >
              <header>
                <span>{group.label}</span>
                <b>{group.rows.length}</b>
              </header>
              <div>
                {group.rows.slice(0, 5).map((student) => (
                  <button
                    key={student.studentId}
                    onClick={() => selectStudent(student)}
                  >
                    <span>
                      <b>{student.studentName}</b>
                      <small>
                        {student.studentId} ·{" "}
                        {String(student.nextDueDate).slice(0, 10)}
                      </small>
                    </span>
                    <strong>{money(student.pendingFee)}</strong>
                  </button>
                ))}
                {group.rows.length === 0 && (
                  <small className="no-dues">No student</small>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="analytics-grid">
        <article className="panel wide">
          <div className="panel-head">
            <div>
              <span>WEEKLY PERFORMANCE</span>
              <h3>Collection trend</h3>
            </div>
            <span className="chart-period">Last 7 days</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="collectionFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#5b46e8" stopOpacity={0.32} />
                    <stop
                      offset="100%"
                      stopColor="#5b46e8"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0f5" vertical={false} />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8b93a7", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8b93a7", fontSize: 11 }}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Area
                  type="monotone"
                  dataKey="collection"
                  stroke="#5b46e8"
                  strokeWidth={3}
                  fill="url(#collectionFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <span>BATCH DISTRIBUTION</span>
              <h3>Active students</h3>
            </div>
          </div>
          <div className="donut-area">
            <div className="donut-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={batchData}
                    innerRadius={62}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {batchData.map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <b>{total}</b>
                <span>Students</span>
              </div>
            </div>
            <div className="legend">
              {batchData.map((item, i) => (
                <span key={item.name}>
                  <i style={{ background: colors[i] }} />
                  <b>{item.name}</b>
                  <small>{item.value}</small>
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>
      <section className="lower-grid">
        <article className="panel">
          <div className="panel-head">
            <div>
              <span>RECENT STUDENTS</span>
              <h3>Latest admissions</h3>
            </div>
            <button onClick={() => setActive("students")}>View all</button>
          </div>
          <div className="recent-list">
            {students.slice(0, 4).map((student) => (
              <button
                key={student.studentId}
                onClick={() => selectStudent(student)}
              >
                <span className="student-avatar">
                  {initials(student.studentName)}
                </span>
                <span>
                  <b>{student.studentName}</b>
                  <small>{student.studentId}</small>
                </span>
                <em>{student.batch}</em>
              </button>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <span>LIVE ATTENDANCE</span>
              <h3>Recent scans</h3>
            </div>
            <button onClick={() => setActive("attendance")}>View log</button>
          </div>
          <div className="timeline">
            {attendance.slice(0, 4).map((entry, index) => (
              <div key={`${entry.studentId}-${index}`}>
                <span className="timeline-dot">
                  <CheckCircle2 size={15} />
                </span>
                <p>
                  <b>{entry.studentName}</b>
                  <small>
                    {entry.studentId} · {entry.batch}
                  </small>
                </p>
                <time>{entry.time}</time>
              </div>
            ))}
          </div>
        </article>
        <article className="panel activity-panel">
          <div className="panel-head">
            <div>
              <span>ADMIN ACTIVITY</span>
              <h3>Recent actions</h3>
            </div>
          </div>
          <div className="activity-list">
            {activities.slice(0, 4).map((item) => (
              <div key={item.id}>
                <span><CheckCircle2 size={14} /></span>
                <p><b>{item.text}</b><small>{item.time}</small></p>
              </div>
            ))}
            {!activities.length && <small className="no-dues">No recorded action yet</small>}
          </div>
        </article>
      </section>
    </div>
  );
}

function StudentsPanel({
  students,
  onSelect,
  onReload,
  session,
  onActivity,
}: {
  students: Student[];
  onSelect: (student: Student) => void;
  onReload: () => Promise<void>;
  session: StaffSession;
  onActivity: (text: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [batch, setBatch] = useState("All batches");
  const [view, setView] = useState<"inquiry" | "admission">("inquiry");
  const [open, setOpen] = useState<"inquiry" | "admission" | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState("");
  const [pendingStudentId, setPendingStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    studentName: "",
    mobile: "",
    whatsappNumber: "",
    fatherName: "",
    course: "UPSI",
    batch: "UPSI",
    totalFee: "",
    registrationFee: "",
    paidFee: "",
    nextDueDate: "",
    discount: "",
    oldStudent: "No",
    inquiryId: "",
    source: "Walk-in",
    notes: "",
    followUpDate: "",
  });
  const filtered = students.filter(
    (student) =>
      `${student.studentName} ${student.studentId} ${student.mobile}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (batch === "All batches" || student.batch === batch),
  );
  const filteredInquiries = inquiries.filter((item) =>
    `${item.studentName} ${item.roughRegistrationNo} ${item.mobile}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const pendingAdmissions = students.filter(
    (student) => student.approvalStatus === "Pending",
  );
  const today = new Date().toISOString().slice(0, 10);
  const followUpsDue = inquiries.filter(
    (item) =>
      item.followUpDate &&
      item.followUpDate <= today &&
      !["Converted", "Closed"].includes(item.status),
  );

  const loadInquiries = useCallback(async () => {
    setInquiriesLoading(true);
    try {
      const result = await api("listInquiries", {}, 12000);
      setInquiries(Array.isArray(result.rows) ? result.rows : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Inquiries load नहीं हुईं।",
      );
    } finally {
      setInquiriesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadInquiries(), 0);
    return () => window.clearTimeout(timer);
  }, [loadInquiries]);

  function resetStudentForm() {
    setForm({
      studentName: "",
      mobile: "",
      whatsappNumber: "",
      fatherName: "",
      course: "UPSI",
      batch: "UPSI",
      totalFee: "",
      registrationFee: "",
      paidFee: "",
      nextDueDate: "",
      discount: "",
      oldStudent: "No",
      inquiryId: "",
      source: "Walk-in",
      notes: "",
      followUpDate: "",
    });
  }

  function fillAdmissionFromInquiry(item: Inquiry) {
    setView("admission");
    setOpen("admission");
    setForm((current) => ({
      ...current,
      studentName: item.studentName || "",
      mobile: item.mobile || "",
      whatsappNumber: item.mobile || "",
      fatherName: item.fatherName || "",
      course: item.course || current.course,
      batch: item.batch || current.batch,
      inquiryId: item.roughRegistrationNo,
    }));
    setError("");
    setMessage(
      `Inquiry ${item.roughRegistrationNo} found. Details auto-filled.`,
    );
  }

  function handleAdmissionMobile(value: string) {
    const mobile = value.replace(/\D/g, "").slice(0, 10);
    setForm((current) => ({ ...current, mobile }));
    if (open !== "admission" || mobile.length !== 10) return;
    const match = [...inquiries]
      .reverse()
      .find(
        (item) =>
          item.mobile.replace(/\D/g, "").slice(-10) === mobile &&
          !["Converted", "Closed"].includes(item.status),
      );
    if (match) fillAdmissionFromInquiry(match);
    else {
      setForm((current) => ({ ...current, inquiryId: "" }));
      setMessage("No pending inquiry found. You can enter a fresh admission.");
    }
  }

  async function changeInquiryStatus(item: Inquiry, status: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        "updateInquiryStatus",
        {
          inquiryId: item.roughRegistrationNo,
          status,
          followUpDate: item.followUpDate || "",
        },
        12000,
      );
      setMessage(`${item.roughRegistrationNo} status updated to ${status}.`);
      await loadInquiries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createInquiry() {
    const mobile = form.mobile.replace(/\D/g, "");
    if (!form.studentName.trim()) return setError("Student name is required.");
    if (!/^\d{10}$/.test(mobile))
      return setError("Enter a valid 10 digit mobile number.");
    if (!form.course.trim()) return setError("Course is required.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api(
        "createInquiry",
        {
          ...form,
          studentName: form.studentName.trim(),
          mobile,
          counselorEmail: session.email,
        },
        pendingStudentId ? 30000 : 15000,
      );
      setMessage(`Inquiry saved. Inquiry ID: ${result.roughRegistrationNo}`);
      setOpen(null);
      resetStudentForm();
      await loadInquiries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inquiry save नहीं हुई।");
    } finally {
      setBusy(false);
    }
  }

  async function createAdmission() {
    const mobile = form.mobile.replace(/\D/g, "");
    const courseFee = Number(form.totalFee || 0),
      discount = Number(form.discount || 0),
      totalFee = courseFee - discount,
      registrationFee = Number(form.registrationFee || 0),
      paidFee = Number(form.paidFee || 0);
    if (!form.studentName.trim()) return setError("Student name is required.");
    if (!/^\d{10}$/.test(mobile))
      return setError("Enter a valid 10 digit mobile number.");
    if (!form.course.trim() || !form.batch.trim())
      return setError("Course and batch are required.");
    if (!form.totalFee || !Number.isFinite(courseFee) || courseFee <= 0)
      return setError("Course fee भरें। उदाहरण: UPSI के लिए 15000.");
    if (
      courseFee < 0 ||
      discount < 0 ||
      discount > courseFee ||
      totalFee < 0 ||
      registrationFee < 0 ||
      paidFee < 0 ||
      registrationFee + paidFee > totalFee
    )
      return setError(
        registrationFee + paidFee > totalFee
          ? "Registration fee और other paid amount, fee after discount से ज्यादा नहीं हो सकते।"
          : "Fee/discount values are not valid.",
      );
    const linkedInquiry = form.inquiryId
      ? inquiries.find((item) => item.roughRegistrationNo === form.inquiryId)
      : undefined;
    const ownerEmail = linkedInquiry?.counselorEmail || session.email;
    if (!ownerEmail)
      return setError("Login session incomplete hai. Logout karke dobara sign in करें.");

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const action = pendingStudentId ? "approvePendingStudent" : "approveStudent";
      const payload = {
        ...form,
        studentName: form.studentName.trim(),
        mobile,
        totalFee: courseFee,
        discount,
        registrationFee,
        paidFee,
        counselorEmail: ownerEmail,
        // Inquiry conversion is deliberately kept outside the admission write.
        // A conversion error must never roll back or make a saved admission look
        // like a failure to the counsellor.
        inquiryId: form.inquiryId,
        studentId: pendingStudentId,
        authToken: session.authToken || "",
      };
      let result;
      try {
        // Admissions can take longer than an inquiry because the backend creates
        // the student, login access and the inquiry conversion together.
        result = await api(action, payload, 65000);
      } catch (firstError) {
        const firstMessage = String(firstError);
        if (!/timed out|temporarily unavailable/i.test(firstMessage)) throw firstError;

        // A pending approval is idempotent in the Sheet backend. For a fresh
        // admission, the first request may have finished after the browser lost
        // its response. Check the live student list before sending it again so
        // we never create a duplicate record.
        setMessage("Admission save status check ho raha hai...");
        try {
          const latest = await api("listStudents", {}, 25000);
          const saved = (latest.rows || []).find(
            (student: Student) =>
              String(student.mobile || "").replace(/\D/g, "").slice(-10) === mobile,
          );
          if (saved) result = { studentId: saved.studentId };
        } catch {
          // The retry below remains the recovery path when the status check is
          // unavailable for a moment.
        }

        if (!result) {
          setMessage("Admission request dobara bheji ja rahi hai...");
          try {
            result = await api(action, payload, 65000);
          } catch (retryError) {
            // If the original request finished while the retry was in flight,
            // Apps Script returns the duplicate guard. Verify the record and
            // complete the screen as saved instead of showing a false failure.
            if (!/already exists/i.test(String(retryError))) throw retryError;
            const latest = await api("listStudents", {}, 25000);
            const saved = (latest.rows || []).find(
              (student: Student) =>
                String(student.mobile || "").replace(/\D/g, "").slice(-10) === mobile,
            );
            if (!saved) throw retryError;
            result = { studentId: saved.studentId };
          }
        }
      }
      setMessage(`Admission saved. Student ID: ${result.studentId}`);
      onActivity(
        pendingStudentId
          ? `Admission approved for ${form.studentName.trim()}`
          : `New admission saved for ${form.studentName.trim()}`,
      );
      setOpen(null);
      setPendingStudentId("");
      resetStudentForm();
      await onReload();
      if (form.inquiryId && !pendingStudentId) {
        try {
          await api(
            "updateInquiryStatus",
            { inquiryId: form.inquiryId, status: "Converted" },
            15000,
          );
        } catch {
          setMessage(
            `Admission saved. Student ID: ${result.studentId}. Inquiry status refresh nahi hua; baad me Convert kar dena.`,
          );
        }
      }
      await loadInquiries();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Admission could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  function openPendingAdmission(student: Student) {
    setPendingStudentId(student.studentId);
    setView("admission");
    setOpen("admission");
    setForm((current) => ({
      ...current,
      studentName: student.studentName,
      mobile: student.mobile,
      whatsappNumber: student.whatsappNumber || student.mobile,
      fatherName: student.fatherName || "",
      course: student.course,
      batch: student.batch,
      oldStudent: student.oldStudent || "No",
    }));
    setMessage(
      `${student.studentName} की registration details loaded हैं। Fee भरकर admission approve करें।`,
    );
  }

  function shareRegistrationLink() {
    const number = window
      .prompt("Student का WhatsApp mobile number डालें (10 digits):", "")
      ?.replace(/\D/g, "");
    if (!number) return;
    if (!/^\d{10}$/.test(number))
      return setError("Valid 10 digit WhatsApp number डालें।");
    const link = `${window.location.origin}/?studentRegister=1&counselor=${encodeURIComponent(session.email)}`;
    const text = `नमस्ते,\n\nEXAMPUR Prayagraj admission registration के लिए नीचे दिए गए link को खोलें। अपनी details, mobile, password और student photo submit करें:\n\n${link}\n\nCounsellor approval के बाद इसी mobile और password से login कर सकेंगे।`;
    window.open(
      `https://wa.me/91${number}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function allotBooks(student: Student) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("markBooksAllotted", { studentId: student.studentId }, 12000);
      setMessage(`Books allotted for ${student.studentName}.`);
      await onReload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Books could not be allotted.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function shareStudent(student: Student) {
    const popup = window.open("about:blank", "_blank");
    setShareBusy(student.studentId);
    setError("");
    setMessage("");
    try {
      const result = await api(
        "createStudentShareLink",
        { studentId: student.studentId },
        12000,
      );
      const backendShareUrl = String(result.shareUrl || "");
      const parsed = new URL(backendShareUrl);
      const studentToken = parsed.searchParams.get("studentToken");
      if (!studentToken)
        throw new Error("Student login has not been created yet.");
      // Always share this live dashboard's origin. The Apps Script BASE_URL may
      // still point to an old/custom domain that is not connected yet.
      const shareUrl = `${window.location.origin}/?studentToken=${encodeURIComponent(studentToken)}`;
      const text = `Hello ${student.studentName},\n\nYour EXAMPUR student login has been created.\n\nLogin here:\n${shareUrl}\n\nPlease open the above link and login using your registered credentials.\n\nनमस्ते ${student.studentName}, ऊपर दिए गए लिंक को खोलकर अपना EXAMPUR Student Portal देखें।\n\nThank you,\nEXAMPUR Prayagraj`;
      const whatsappUrl = `https://wa.me/91${String(
        result.whatsappNumber ||
          student.whatsappNumber ||
          result.mobile ||
          student.mobile,
      )
        .replace(/\D/g, "")
        .slice(-10)}?text=${encodeURIComponent(text)}`;
      if (popup) {
        popup.opener = null;
        popup.location.href = whatsappUrl;
      } else window.location.href = whatsappUrl;
      setMessage(`WhatsApp login prepared for ${student.studentName}.`);
      void api("markWhatsAppSent", { studentId: student.studentId }).catch(
        () => undefined,
      );
    } catch (err) {
      if (popup) popup.close();
      setError(
        err instanceof Error
          ? err.message
          : "Student login link could not be created.",
      );
    } finally {
      setShareBusy("");
    }
  }

  return (
    <section className="panel table-panel">
      <div className="page-title">
        <div>
          <span>STUDENT MANAGEMENT</span>
          <h1>
            {view === "inquiry" ? "Student inquiries" : "Students & admissions"}
          </h1>
          <p>
            {view === "inquiry"
              ? "New student inquiries from the real backend."
              : "Admissions, login links and student ID cards."}
          </p>
        </div>
        <div className="button-row">
          <button onClick={shareRegistrationLink}>
            <MessageCircle size={18} /> Share Registration Link
          </button>
          <button
            className={view === "inquiry" ? "filled" : ""}
            onClick={() => {
              setView("inquiry");
              setOpen(null);
              setError("");
              setMessage("");
            }}
          >
            <UserPlus size={18} /> Inquiry Folder
          </button>
          <button
            className={view === "admission" ? "filled" : ""}
            onClick={() => {
              setView("admission");
              setOpen(null);
              setError("");
              setMessage("");
            }}
          >
            <UserPlus size={18} /> Admission Folder
          </button>
        </div>
      </div>
      {error && (
        <div className="alert error table-alert">
          {error}
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {message && <div className="alert success table-alert">{message}</div>}
      {view === "inquiry" && followUpsDue.length > 0 && (
        <div className="followup-reminder">
          <Bell size={18} />
          <span>
            <b>Follow-up due: {followUpsDue.length}</b>
            {" — "}{followUpsDue.slice(0, 3).map((item) => item.studentName).join(", ")}
            {followUpsDue.length > 3 ? "…" : ""}
          </span>
        </div>
      )}
      {view === "inquiry" && (
        <div className="folder-action-bar">
          <div>
            <b>Inquiry Folder</b>
            <small>पहले inquiry save करें। Admission के लिए registration number संभाल कर रखें।</small>
          </div>
          <button
            className="primary-action"
            disabled={busy}
            onClick={() => {
              setOpen("inquiry");
              setError("");
              setMessage("");
            }}
          >
            <UserPlus size={18} /> New inquiry
          </button>
        </div>
      )}
      {view === "admission" && (
        <div className="admission-lookup-card">
          <div>
            <span>ADMISSION FOLDER</span>
            <h3>Find saved inquiry first</h3>
            <p>Registration number, mobile number या student name डालकर inquiry खोजें। फिर उसी record से admission खोलें।</p>
          </div>
          <label>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="EX-ADD-1001, mobile or name"
            />
          </label>
        </div>
      )}
      {view === "admission" && query.trim() && (
        <div className="admission-search-results">
          <b>Matching inquiries ({filteredInquiries.length})</b>
          {filteredInquiries.slice(0, 6).map((item) => (
            <div className="admission-search-row" key={item.roughRegistrationNo}>
              <span>
                <b>{item.studentName}</b>
                <small>{item.roughRegistrationNo} · +91 {item.mobile} · {item.course}</small>
              </span>
              <button
                className="approve"
                disabled={["Converted", "Closed"].includes(item.status)}
                onClick={() => fillAdmissionFromInquiry(item)}
              >
                <UserPlus size={16} /> Open admission
              </button>
            </div>
          ))}
          {!filteredInquiries.length && <small>No matching inquiry found. Check registration number, mobile or name.</small>}
        </div>
      )}
      {view === "admission" && (
        <div className="pending-admissions-panel">
          <div className="pending-admissions-head">
            <div>
              <span>PENDING STUDENT REGISTRATIONS</span>
              <b>Admission Approvals: {pendingAdmissions.length}</b>
              <small>
                Student registration approve करने के बाद ही उसका login चालू होगा।
              </small>
            </div>
            <button
              className="mini-action"
              disabled={busy}
              onClick={() => void onReload()}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
          {pendingAdmissions.length ? (
            <div className="pending-admissions-list">
              {pendingAdmissions.slice(0, 4).map((student) => (
                <div className="pending-admission-row" key={student.studentId}>
                  <span className="student-avatar">{initials(student.studentName)}</span>
                  <span>
                    <b>{student.studentName}</b>
                    <small>
                      {student.studentId} · +91 {student.mobile} · {student.course}
                    </small>
                  </span>
                  <button
                    className="approve"
                    disabled={busy}
                    onClick={() => openPendingAdmission(student)}
                  >
                    <CheckCircle2 size={15} /> Approve Admission
                  </button>
                </div>
              ))}
              {pendingAdmissions.length > 4 && (
                <small className="pending-more">
                  +{pendingAdmissions.length - 4} more pending registrations नीचे list में हैं।
                </small>
              )}
            </div>
          ) : (
            <div className="pending-empty">
              <CheckCircle2 size={18} /> कोई pending student registration नहीं है।
            </div>
          )}
        </div>
      )}
      {view === "admission" && (
        <div className="table-tools">
          <select value={batch} onChange={(e) => setBatch(e.target.value)}>
            <option>All batches</option>
            {BATCHES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button onClick={() => window.print()}>
            <Download size={17} /> Export / Print
          </button>
        </div>
      )}
      {view === "inquiry" ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inquiry ID</th>
                <th>Student</th>
                <th>Mobile</th>
                <th>Course / Batch</th>
                <th>Date</th>
                <th>Follow up</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((item) => (
                <tr key={item.roughRegistrationNo}>
                  <td>
                    <code>{item.roughRegistrationNo}</code>
                  </td>
                  <td>
                    <b>{item.studentName}</b>
                    <small className="table-sub">
                      {item.fatherName || "—"}
                    </small>
                  </td>
                  <td>+91 {item.mobile}</td>
                  <td>
                    <b>{item.course}</b>
                    <small className="table-sub">{item.batch || "—"}</small>
                  </td>
                  <td>
                    {String(item.inquiryDate || item.createdAt || "—").slice(
                      0,
                      10,
                    )}
                  </td>
                  <td>{item.followUpDate || "—"}</td>
                  <td>
                    <select
                      value={item.status || "New"}
                      disabled={busy}
                      onChange={(event) =>
                        void changeInquiryStatus(item, event.target.value)
                      }
                    >
                      {[
                        "New",
                        "Follow Up",
                        "Waiting",
                        "Converted",
                        "Closed",
                      ].map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      className="mini-action"
                      disabled={["Converted", "Closed"].includes(item.status)}
                      onClick={() => {
                        setView("admission");
                        setOpen(null);
                        setQuery(item.roughRegistrationNo);
                      }}
                    >
                      Open Admission Folder
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {inquiriesLoading && (
            <div className="empty-state">
              <RefreshCw className="spin" size={28} />
              <b>Loading inquiries...</b>
            </div>
          )}
          {!inquiriesLoading && filteredInquiries.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <b>No inquiry found</b>
              <span>Create the first inquiry from the Inquiry button.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Course / Batch</th>
                <th>Fee status</th>
                <th>Next due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.studentId}>
                  <td>
                    <div className="student-cell">
                      <span className="student-avatar">
                        {initials(student.studentName)}
                      </span>
                      <span>
                        <b>{student.studentName}</b>
                        <small>+91 {student.mobile}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <code>{student.studentId}</code>
                  </td>
                  <td>
                    <b>{student.course}</b>
                    <small className="table-sub">{student.batch} Batch</small>
                  </td>
                  <td>
                    <b>{money(student.paidFee)}</b>
                    <div className="fee-progress">
                      <i
                        style={{
                          width: `${Math.min(100, student.totalFee ? (student.paidFee / student.totalFee) * 100 : 0)}%`,
                        }}
                      />
                    </div>
                    <small className="table-sub">
                      {student.pendingFee
                        ? `${money(student.pendingFee)} pending`
                        : "Fully paid"}
                    </small>
                  </td>
                  <td>{student.nextDueDate || "—"}</td>
                  <td>
                    <span
                      className={`status ${student.approvalStatus === "Approved" && student.active !== false ? "active" : "inactive"}`}
                    >
                      <i />{" "}
                      {student.approvalStatus ||
                        (student.active === false ? "Inactive" : "Active")}
                    </span>
                  </td>
                  <td>
                    <div className="student-actions">
                      {student.approvalStatus === "Pending" && (
                        <button
                          className="approve"
                          onClick={() => openPendingAdmission(student)}
                        >
                          <CheckCircle2 size={15} /> Approve Admission
                        </button>
                      )}
                      {student.approvalStatus === "Approved" &&
                        (student.booksAllotted ? (
                          <span className="status active">
                            <i /> Books allotted
                          </span>
                        ) : student.pendingFee <= 0 ? (
                          <button
                            className="approve"
                            disabled={busy}
                            onClick={() => void allotBooks(student)}
                          >
                            <CheckCircle2 size={15} /> Allot books
                          </button>
                        ) : (
                          <span className="login-missing">
                            Books: full fee required
                          </span>
                        ))}
                      <button
                        className="mini-action"
                        onClick={() => onSelect(student)}
                      >
                        View ID
                      </button>
                      {student.approvalStatus === "Pending" ? (
                        <span className="login-missing">
                          Student registration approval pending.
                        </span>
                      ) : student.loginEnabled ? (
                        <button
                          className="whatsapp-action"
                          disabled={shareBusy === student.studentId}
                          onClick={() => shareStudent(student)}
                        >
                          {shareBusy === student.studentId ? (
                            <RefreshCw className="spin" size={15} />
                          ) : (
                            <MessageCircle size={15} />
                          )}{" "}
                          Share Student Login on WhatsApp
                        </button>
                      ) : (
                        <span className="login-missing">
                          Student login has not been created yet.
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <b>No student found</b>
              <span>No matching real backend record is available.</span>
            </div>
          )}
        </div>
      )}
      {open && (
        <div className="modal-backdrop">
          <div className="modal-card admission-modal">
            <button className="modal-close" onClick={() => setOpen(null)}>
              <X size={20} />
            </button>
            <span className="eyebrow dark">
              {open === "inquiry"
                ? "NEW INQUIRY"
                : pendingStudentId
                  ? "PENDING ADMISSION APPROVAL"
                  : "NEW STUDENT"}
            </span>
            <h2>
              {open === "inquiry"
                ? "Create inquiry"
                : pendingStudentId
                  ? "Approve student admission"
                  : "Create admission"}
            </h2>
            <div className="form-grid">
              <label>
                Student name *
                <input
                  value={form.studentName}
                  onChange={(e) =>
                    setForm({ ...form, studentName: e.target.value })
                  }
                />
              </label>
              <label>
                Mobile number *
                <input
                  inputMode="numeric"
                  value={form.mobile}
                  onChange={(e) =>
                    open === "admission"
                      ? handleAdmissionMobile(e.target.value)
                      : setForm({
                          ...form,
                          mobile: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10),
                        })
                  }
                />
              </label>
              <label>
                WhatsApp number
                <input
                  inputMode="numeric"
                  value={form.whatsappNumber}
                  onChange={(e) =>
                    setForm({ ...form, whatsappNumber: e.target.value })
                  }
                  placeholder="Blank रखने पर mobile number use होगा"
                />
              </label>
              <label>
                Father&apos;s name
                <input
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm({ ...form, fatherName: e.target.value })
                  }
                />
              </label>
              <label>
                Course *
                <input
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                />
              </label>
              <label>
                Batch *
                <select
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                >
                  {BATCHES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              {open === "inquiry" ? (
                <>
                  <label>
                    Inquiry source
                    <select
                      value={form.source}
                      onChange={(e) =>
                        setForm({ ...form, source: e.target.value })
                      }
                    >
                      {[
                        "Walk-in",
                        "Call",
                        "WhatsApp",
                        "Referral",
                        "Social Media",
                        "Website",
                      ].map((source) => (
                        <option key={source}>{source}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Follow-up date
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(e) =>
                        setForm({ ...form, followUpDate: e.target.value })
                      }
                    />
                  </label>
                  <label className="full">
                    Notes
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  {form.inquiryId && (
                    <div className="alert success full">
                      Matched inquiry: <b>{form.inquiryId}</b>
                    </div>
                  )}
                  <label>
                    Old student
                    <select
                      value={form.oldStudent}
                      onChange={(e) =>
                        setForm({ ...form, oldStudent: e.target.value })
                      }
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </label>
                  <label>
                    Course fee *
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.totalFee}
                      onChange={(e) =>
                        setForm({ ...form, totalFee: e.target.value })
                      }
                      placeholder="e.g. 15000"
                    />
                  </label>
                  <label>
                    Discount
                    <input
                      type="number"
                      min="0"
                      value={form.discount}
                      onChange={(e) =>
                        setForm({ ...form, discount: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Fee after discount
                    <input
                      readOnly
                      value={Math.max(
                        0,
                        Number(form.totalFee || 0) - Number(form.discount || 0),
                      )}
                    />
                  </label>
                  <label>
                    Registration fee
                    <input
                      type="number"
                      min="0"
                      value={form.registrationFee}
                      onChange={(e) =>
                        setForm({ ...form, registrationFee: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Other paid amount
                    <input
                      type="number"
                      min="0"
                      value={form.paidFee}
                      onChange={(e) =>
                        setForm({ ...form, paidFee: e.target.value })
                      }
                    />
                    <small className="field-help">
                      Total received today: {money(Number(form.registrationFee || 0) + Number(form.paidFee || 0))}
                    </small>
                  </label>
                  <label>
                    Next due date
                    <input
                      type="date"
                      value={form.nextDueDate}
                      onChange={(e) =>
                        setForm({ ...form, nextDueDate: e.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>
            {error && <div className="alert error">{error}</div>}
            <button
              className="primary-action"
              disabled={busy}
              onClick={open === "inquiry" ? createInquiry : createAdmission}
            >
              {busy ? (
                <RefreshCw className="spin" size={18} />
              ) : (
                <UserPlus size={18} />
              )}{" "}
              {busy
                ? "Saving..."
                : open === "inquiry"
                  ? "Save inquiry"
                  : pendingStudentId
                    ? "Approve admission"
                    : "Save admission"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function StudentCard({ student }: { student: Student }) {
  return (
    <div className="identity-card" id="printable-id-card">
      <div className="id-top">
        <Brand compact />
        <span>STUDENT IDENTITY CARD</span>
      </div>
      <div className="id-body">
        <div className="id-photo">
          {student.photoUrl ? (
            <div
              className="id-photo-image"
              role="img"
              aria-label={student.studentName}
              style={{ backgroundImage: `url(${student.photoUrl})` }}
            />
          ) : (
            <span>{initials(student.studentName)}</span>
          )}
        </div>
        <div className="id-info">
          <small>STUDENT NAME</small>
          <h2>{student.studentName}</h2>
          <dl>
            <div>
              <dt>Student ID</dt>
              <dd>{student.studentId}</dd>
            </div>
            <div>
              <dt>Registration No.</dt>
              <dd>{student.registrationNo}</dd>
            </div>
            <div>
              <dt>Course / Batch</dt>
              <dd>
                {student.course} · {student.batch}
              </dd>
            </div>
            <div>
              <dt>Valid at</dt>
              <dd>EXAMPUR Prayagraj Centre</dd>
            </div>
          </dl>
        </div>
        <div className="id-qr">
          <div>
            <QRCode
              value={`EXAMPUR|${student.studentId}|${student.batch}`}
              size={112}
              bgColor="#ffffff"
              fgColor="#121729"
              level="M"
            />
          </div>
          <span>SCAN FOR ATTENDANCE</span>
        </div>
      </div>
      <div className="id-bottom">
        <span>Hashimpur Road, Prayagraj</span>
        <span>
          <ShieldCheck size={13} /> VERIFIED STUDENT
        </span>
        <span>exampur.com</span>
      </div>
    </div>
  );
}
function IdCardStudio({
  students,
  selected,
  setSelected,
  onPhotoChange,
}: {
  students: Student[];
  selected: Student | null;
  setSelected: (student: Student) => void;
  onPhotoChange: (studentId: string, photoUrl: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [photoStatus, setPhotoStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const visible = students.filter((student) =>
    `${student.studentName} ${student.studentId} ${student.mobile}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  function printStudentCard() {
    if (!selected) return;
    const previousTitle = document.title;
    const safeName = selected.studentName
      .replace(/[^a-zA-Z0-9\u0900-\u097F -]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    document.title = `${safeName || "Student"}-${selected.studentId}-ID-Card`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  }
  async function uploadPhoto(file?: File) {
    if (!file || !selected) return;
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)
      return setPhotoStatus("JPG/PNG photo 8 MB से छोटी रखें।");
    setPhotoStatus("Photo तैयार हो रही है...");
    try {
      const photoUrl = await resizeStudentPhoto(file);
      localStorage.setItem(studentPhotoKey(selected.studentId), photoUrl);
      onPhotoChange(selected.studentId, photoUrl);
      setPhotoStatus("Photo इस device पर save हो गई।");
    } catch (err) {
      setPhotoStatus(
        err instanceof Error ? err.message : "Photo save नहीं हुई।",
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <div className="studio-grid">
      <section className="panel student-picker">
        <div className="panel-head">
          <div>
            <span>STUDENT ID CARD</span>
            <h3>Select student</h3>
          </div>
        </div>
        <label className="picker-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, ID or mobile..."
          />
        </label>
        <div className="picker-list">
          {visible.map((student) => (
            <button
              key={student.studentId}
              className={
                selected?.studentId === student.studentId ? "active" : ""
              }
              onClick={() => {
                setSelected(student);
                setPhotoStatus("");
              }}
            >
              <span className="student-avatar">
                {initials(student.studentName)}
              </span>
              <span>
                <b>{student.studentName}</b>
                <small>{student.studentId}</small>
              </span>
              <ChevronDown size={16} />
            </button>
          ))}
          {visible.length === 0 && (
            <div className="picker-empty">No student found</div>
          )}
        </div>
      </section>
      <section className="panel card-preview-panel">
        {selected ? (
          <>
            <div className="page-title compact">
              <div>
                <span>PRINT-READY ID</span>
                <h1>Student ID card</h1>
                <p>QR attendance code is generated automatically.</p>
              </div>
              <div className="button-row">
                <input
                  ref={fileRef}
                  className="photo-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => uploadPhoto(e.target.files?.[0])}
                />
                <button onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={17} />{" "}
                  {selected.photoUrl ? "Change photo" : "Upload photo"}
                </button>
                <button onClick={printStudentCard}>
                  <Printer size={17} /> Print / PDF
                </button>
                <button className="filled" onClick={printStudentCard}>
                  <Download size={17} /> Save card
                </button>
              </div>
            </div>
            {photoStatus && <div className="photo-status">{photoStatus}</div>}
            <div className="card-stage">
              <StudentCard student={selected} />
            </div>
            <div className="security-note">
              <ShieldCheck size={20} />
              <div>
                <b>Secure QR payload</b>
                <span>
                  The QR contains only Student ID and batch. Mobile number and
                  fee details are never embedded.
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <IdCard size={34} />
            <b>No student selected</b>
            <span>Select a real student record to generate the ID card.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function CounselorDirectory({
  rows,
  loading,
  error,
  onRefresh,
  onSelect,
}: {
  rows: Counselor[];
  loading: boolean;
  error: string;
  onRefresh: () => Promise<void>;
  onSelect: (row: Counselor) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = rows.filter((row) =>
    `${row.name} ${row.counselorId} ${row.mobile} ${row.email}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <section className="panel table-panel">
      <div className="page-title">
        <div>
          <span>COUNSELLOR MANAGEMENT</span>
          <h1>Counsellors</h1>
          <p>
            Approved, pending and rejected counsellor records from the live
            backend.
          </p>
        </div>
        <button
          className="filled"
          onClick={() => void onRefresh()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "spin" : ""} size={18} /> Refresh
        </button>
      </div>
      {error && (
        <div className="alert error table-alert">
          {error}
          <button onClick={() => void onRefresh()}>Retry</button>
        </div>
      )}
      <div className="table-tools">
        <label>
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, counsellor ID, mobile or email..."
          />
        </label>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Counsellor</th>
              <th>Counsellor ID</th>
              <th>Mobile</th>
              <th>Joining date</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.email}>
                <td>
                  <div className="student-cell">
                    <span className="student-avatar">
                      {initials(row.name || "C")}
                    </span>
                    <span>
                      <b>{row.name || "Unnamed counsellor"}</b>
                      <small>{row.email}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <code>{row.counselorId || "Not assigned"}</code>
                </td>
                <td>+91 {row.mobile || "—"}</td>
                <td>
                  {row.joiningDate ? String(row.joiningDate).slice(0, 10) : "—"}
                </td>
                <td>
                  <span
                    className={`request-status ${String(row.status || "pending")
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    <i /> {row.status || "Pending"}
                  </span>
                </td>
                <td>
                  <button
                    className="mini-action"
                    onClick={() => onSelect(row)}
                    disabled={!row.counselorId}
                  >
                    View ID card
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="empty-state">
            <RefreshCw className="spin" size={28} />
            <b>Loading counsellors...</b>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <Users size={30} />
            <b>No counsellor record found</b>
            <span>Try another search or refresh the live backend.</span>
          </div>
        )}
      </div>
    </section>
  );
}

function downloadCounselorCard(row: Counselor) {
  const safe = (value: unknown) =>
    String(value || "—").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[char] || char,
    );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="660"><rect width="1050" height="660" rx="36" fill="#11162b"/><rect x="28" y="28" width="994" height="604" rx="28" fill="#fff"/><rect x="28" y="28" width="994" height="132" rx="28" fill="#ffbf18"/><text x="70" y="92" font-family="Arial" font-weight="800" font-size="46" fill="#301b14">EXAMPUR Offline</text><text x="70" y="132" font-family="Arial" font-size="22" fill="#301b14">PRAYAGRAJ CENTRE · COUNSELLOR IDENTITY CARD</text><circle cx="180" cy="330" r="92" fill="#5b46e8"/><text x="180" y="352" text-anchor="middle" font-family="Arial" font-weight="700" font-size="52" fill="#fff">${safe(initials(row.name || "C"))}</text><text x="320" y="260" font-family="Arial" font-size="22" fill="#7b8295">COUNSELLOR NAME</text><text x="320" y="310" font-family="Arial" font-weight="700" font-size="42" fill="#11162b">${safe(row.name)}</text><text x="320" y="370" font-family="Arial" font-size="24" fill="#4d5568">ID: ${safe(row.counselorId)}</text><text x="320" y="415" font-family="Arial" font-size="24" fill="#4d5568">Mobile: +91 ${safe(row.mobile)}</text><text x="320" y="460" font-family="Arial" font-size="24" fill="#4d5568">Designation: ${safe(row.designation || "Counsellor")}</text><text x="70" y="575" font-family="Arial" font-size="21" fill="#4d5568">Hashimpur Road, Prayagraj</text><text x="980" y="575" text-anchor="end" font-family="Arial" font-weight="700" font-size="21" fill="#1f9d71">VERIFIED STAFF</text></svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `${row.counselorId || "counsellor"}-id-card.svg`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CounselorIdCardPanel({
  selected,
  session,
}: {
  selected: Counselor | null;
  session: StaffSession;
}) {
  const [row, setRow] = useState<Counselor | null>(selected),
    [loading, setLoading] = useState(!selected),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(
        "getCounselor",
        selected?.counselorId
          ? { counselorId: selected.counselorId }
          : { email: session.email },
      );
      setRow(result.counselor);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Counsellor ID card could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [selected, session.email]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  if (loading)
    return (
      <section className="panel card-preview-panel">
        <div className="empty-state">
          <RefreshCw className="spin" size={30} />
          <b>Loading counsellor ID card...</b>
          <span>Verifying the live staff record.</span>
        </div>
      </section>
    );
  if (error || !row)
    return (
      <section className="panel card-preview-panel">
        <div className="empty-state error-state">
          <X size={30} />
          <b>ID card could not be generated</b>
          <span>{error || "Counsellor record is missing."}</span>
          <button className="filled" onClick={() => void load()}>
            <RefreshCw size={17} /> Retry
          </button>
        </div>
      </section>
    );
  return (
    <section className="panel card-preview-panel counselor-card-panel">
      <div className="page-title compact">
        <div>
          <span>VERIFIED COUNSELLOR</span>
          <h1>Counsellor ID card</h1>
          <p>Generated from the approved live staff record.</p>
        </div>
        <div className="button-row">
          <button onClick={() => window.print()}>
            <Printer size={17} /> Print / PDF
          </button>
          <button className="filled" onClick={() => downloadCounselorCard(row)}>
            <Download size={17} /> Download card
          </button>
        </div>
      </div>
      <div className="card-stage">
        <div
          className="identity-card counsellor-identity"
          id="printable-counsellor-card"
        >
          <div className="id-top">
            <Brand compact />
            <span>COUNSELLOR IDENTITY CARD</span>
          </div>
          <div className="id-body">
            <div className="id-photo">
              {row.photoUrl ? (
                <div
                  className="id-photo-image"
                  role="img"
                  aria-label={row.name}
                  style={{ backgroundImage: `url(${row.photoUrl})` }}
                />
              ) : (
                <span>{initials(row.name || "C")}</span>
              )}
            </div>
            <div className="id-info">
              <small>COUNSELLOR NAME</small>
              <h2>{row.name || "—"}</h2>
              <dl>
                <div>
                  <dt>Counsellor ID</dt>
                  <dd>{row.counselorId || "—"}</dd>
                </div>
                <div>
                  <dt>Designation</dt>
                  <dd>{row.designation || "Counsellor"}</dd>
                </div>
                <div>
                  <dt>Mobile</dt>
                  <dd>{row.mobile ? `+91 ${row.mobile}` : "—"}</dd>
                </div>
                <div>
                  <dt>Joining date</dt>
                  <dd>
                    {row.joiningDate
                      ? String(row.joiningDate).slice(0, 10)
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="id-qr">
              <div>
                <QRCode
                  value={`EXAMPUR|COUNSELLOR|${row.counselorId}`}
                  size={112}
                  bgColor="#ffffff"
                  fgColor="#121729"
                  level="M"
                />
              </div>
              <span>VERIFIED STAFF ID</span>
            </div>
          </div>
          <div className="id-bottom">
            <span>Hashimpur Road, Prayagraj</span>
            <span>
              <ShieldCheck size={13} />{" "}
              {row.status === "Approved" && row.active !== false
                ? "ACTIVE COUNSELLOR"
                : row.status}
            </span>
            <span>EXAMPUR Offline</span>
          </div>
        </div>
      </div>
      <div className="security-note">
        <ShieldCheck size={20} />
        <div>
          <b>Safe backend handling</b>
          <span>
            Missing optional photo/designation fields use safe fallbacks;
            passwords and backend identifiers are never printed.
          </span>
        </div>
      </div>
    </section>
  );
}

function StudentPortal({ token }: { token: string }) {
  const [student, setStudent] = useState<Student | null>(null),
    [slots, setSlots] = useState<TimeSlot[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [requiresMobile, setRequiresMobile] = useState(false),
    [maskedMobile, setMaskedMobile] = useState(""),
    [studentName, setStudentName] = useState(""),
    [mobile, setMobile] = useState(""),
    [verifying, setVerifying] = useState(false),
    [photoBusy, setPhotoBusy] = useState(false),
    [photoMessage, setPhotoMessage] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  function deviceId() {
    let id = localStorage.getItem("exampur_student_device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("exampur_student_device", id);
    }
    return id;
  }
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(
        "studentAccessByToken",
        { token, deviceId: deviceId() },
        12000,
      );
      setRequiresMobile(Boolean(result.requiresMobile));
      setMaskedMobile(String(result.maskedMobile || ""));
      setStudentName(String(result.studentName || ""));
      if (result.student?.studentName && result.student?.studentId) {
        setStudent(result.student);
        setSlots(result.timetable || []);
      } else if (!result.requiresMobile) {
        throw new Error(
          "Student record is incomplete. Please open the registration link again.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Student login could not be verified.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function verifyMobile() {
    const clean = mobile.replace(/\D/g, "");
    if (!/^\d{10}$/.test(clean))
      return setError("Registered 10 digit mobile number डालें।");
    setVerifying(true);
    setError("");
    try {
      const result = await api(
        "verifyStudentMobile",
        { token, mobile: clean, deviceId: deviceId() },
        12000,
      );
      if (!result.student?.studentName || !result.student?.studentId)
        throw new Error("Student record could not be loaded. Please retry.");
      setStudent(result.student);
      setSlots(result.timetable || []);
      setRequiresMobile(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mobile verification नहीं हुई।",
      );
    } finally {
      setVerifying(false);
    }
  }
  async function capturePhoto(file?: File) {
    if (!file || !student) return;
    setPhotoBusy(true);
    setPhotoMessage("Photo तैयार हो रही है...");
    try {
      const photoUrl = await resizeStudentPhoto(file);
      if (photoUrl.length > 48000)
        throw new Error("Photo size बड़ी है। Camera से दोबारा capture करें।");
      await api(
        "updateStudentPhoto",
        { token, studentId: student.studentId, deviceId: deviceId(), photoUrl },
        15000,
      );
      setStudent({ ...student, photoUrl });
      setPhotoMessage("Student photo successfully save हो गई।");
    } catch (err) {
      setPhotoMessage(
        err instanceof Error ? err.message : "Photo save नहीं हुई।",
      );
    } finally {
      setPhotoBusy(false);
      if (photoRef.current) photoRef.current.value = "";
    }
  }
  return (
    <main className="student-portal">
      <header>
        <Brand />
        <span>STUDENT PORTAL</span>
      </header>
      <div className="student-portal-wrap">
        {loading ? (
          <div className="panel empty-state">
            <RefreshCw className="spin" size={32} />
            <b>Verifying student login...</b>
          </div>
        ) : requiresMobile ? (
          <section className="panel student-mobile-login">
            <ShieldCheck size={38} />
            <span>STUDENT VERIFICATION</span>
            <h2>{studentName || "Student login"}</h2>
            <p>
              अपना registered mobile number डालकर इस device पर dashboard खोलें।
              Registered number: <b>{maskedMobile}</b>
            </p>
            <label>
              Registered mobile number
              <input
                inputMode="numeric"
                maxLength={10}
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                onKeyDown={(e) => e.key === "Enter" && void verifyMobile()}
                placeholder="10 digit mobile number"
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <button
              className="primary-action"
              disabled={verifying}
              onClick={() => void verifyMobile()}
            >
              {verifying ? (
                <RefreshCw className="spin" size={18} />
              ) : (
                <ShieldCheck size={18} />
              )}{" "}
              {verifying ? "Verifying..." : "Verify & open dashboard"}
            </button>
          </section>
        ) : error || !student ? (
          <div className="panel empty-state error-state">
            <X size={32} />
            <b>Student portal could not open</b>
            <span>{error || "Invalid student login link."}</span>
            <button className="filled" onClick={() => void load()}>
              <RefreshCw size={17} /> Retry
            </button>
          </div>
        ) : (
          <>
            <section className="panel student-photo-capture">
              <div>
                <Camera size={24} />
                <span>
                  <b>Student photo</b>
                  <small>
                    Camera से photo capture करें या gallery से चुनें।
                  </small>
                </span>
              </div>
              <input
                ref={photoRef}
                className="photo-file-input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => void capturePhoto(e.target.files?.[0])}
              />
              <button
                className="filled"
                disabled={photoBusy}
                onClick={() => photoRef.current?.click()}
              >
                {photoBusy ? (
                  <RefreshCw className="spin" size={17} />
                ) : (
                  <Camera size={17} />
                )}{" "}
                {student.photoUrl ? "Update photo" : "Capture photo"}
              </button>
              {photoMessage && (
                <span className="photo-status">{photoMessage}</span>
              )}
            </section>
            <StudentCard student={student} />
            <section className="stats-grid small">
              <StatCard
                label="Paid Fee"
                value={money(student.paidFee)}
                note="Recorded payment"
                icon={CircleIndianRupee}
                tone="green"
              />
              <StatCard
                label="Pending Fee"
                value={money(student.pendingFee)}
                note="Current due"
                icon={WalletCards}
                tone="orange"
              />
              <StatCard
                label="Batch"
                value={student.batch || "—"}
                note={student.course || "Course"}
                icon={Users}
                tone="blue"
              />
              <StatCard
                label="Next Due"
                value={
                  student.nextDueDate
                    ? String(student.nextDueDate).slice(0, 10)
                    : "—"
                }
                note="Fee follow-up"
                icon={CalendarDays}
                tone="purple"
              />
            </section>
            <section className="panel table-panel">
              <div className="panel-head">
                <div>
                  <span>REGULAR CLASSES</span>
                  <h3>Timetable</h3>
                </div>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr
                        key={
                          slot.timetableId || `${slot.day}-${slot.startTime}`
                        }
                      >
                        <td>{slot.day}</td>
                        <td>
                          {slot.startTime} – {slot.endTime}
                        </td>
                        <td>{slot.subject}</td>
                        <td>{slot.teacher || "—"}</td>
                        <td>
                          {slot.isCancelled ? "Cancelled" : slot.classStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {slots.length === 0 && (
                  <div className="empty-state">
                    <CalendarDays size={28} />
                    <b>Timetable not added yet</b>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function StudentRegistration({ counselorEmail }: { counselorEmail: string }) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [form, setForm] = useState({
    studentName: "",
    mobile: "",
    fatherName: "",
    course: "UPSI",
    batch: "UPSI",
    oldStudent: "No",
    password: "",
    photoUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  function deviceId() {
    let id = localStorage.getItem("exampur_student_device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("exampur_student_device", id);
    }
    return id;
  }
  async function capture(file?: File) {
    if (!file) return;
    setError("");
    try {
      const photoUrl = await resizeStudentPhoto(file);
      if (photoUrl.length > 48000) throw new Error("Photo size is too large.");
      setForm((current) => ({ ...current, photoUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo capture failed.");
    }
  }
  async function submit() {
    const mobile = form.mobile.replace(/\D/g, "");
    if (!/^\d{10}$/.test(mobile) || form.password.length < 6)
      return setError(
        "10 digit mobile और कम से कम 6 character password डालें।",
      );
    if (mode === "register" && (!form.studentName.trim() || !form.photoUrl))
      return setError("Student name और live photo जरूरी है।");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") {
        const result = await api(
          "registerStudent",
          { ...form, mobile, counselorEmail },
          15000,
        );
        setMessage(
          `Registration ${result.studentId} counsellor approval के लिए भेज दिया गया है। Approval के बाद login करें।`,
        );
        setMode("login");
      } else {
        const result = await api(
          "loginStudent",
          { mobile, password: form.password, deviceId: deviceId() },
          15000,
        );
        window.location.href = `${window.location.origin}/?studentToken=${encodeURIComponent(result.token)}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="student-portal registration-page">
      <header>
        <Brand />{" "}
        <span>STUDENT {mode === "register" ? "REGISTRATION" : "LOGIN"}</span>
      </header>
      <div className="student-portal-wrap">
        <section className="panel student-mobile-login">
          <ShieldCheck size={38} />
          <h2>
            {mode === "register" ? "Create student account" : "Student login"}
          </h2>
          <p>
            {mode === "register"
              ? "Details और photo submit करने के बाद counsellor admission approve करेंगे।"
              : "Approval के बाद registered mobile और password से login करें।"}
          </p>
          {mode === "register" && (
            <div className="form-grid">
              <label>
                Student name *
                <input
                  value={form.studentName}
                  onChange={(e) =>
                    setForm({ ...form, studentName: e.target.value })
                  }
                />
              </label>
              <label>
                Father&apos;s name *
                <input
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm({ ...form, fatherName: e.target.value })
                  }
                />
              </label>
              <label>
                Course *
                <input
                  value={form.course}
                  onChange={(e) => setForm({ ...form, course: e.target.value })}
                />
              </label>
              <label>
                Batch *
                <select
                  value={form.batch}
                  onChange={(e) => setForm({ ...form, batch: e.target.value })}
                >
                  {BATCHES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Old student
                <select
                  value={form.oldStudent}
                  onChange={(e) =>
                    setForm({ ...form, oldStudent: e.target.value })
                  }
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </label>
            </div>
          )}
          <label>
            Mobile number *
            <input
              inputMode="numeric"
              maxLength={10}
              value={form.mobile}
              onChange={(e) =>
                setForm({
                  ...form,
                  mobile: e.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
            />
          </label>
          <label>
            Password *
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 characters"
            />
          </label>
          {mode === "register" && (
            <>
              <input
                ref={photoRef}
                className="photo-file-input"
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => void capture(e.target.files?.[0])}
              />
              <button
                className="filled"
                onClick={() => photoRef.current?.click()}
              >
                <Camera size={17} />{" "}
                {form.photoUrl ? "Retake photo" : "Capture student photo *"}
              </button>
              {form.photoUrl && (
                <div
                  className="student-avatar large"
                  style={{
                    backgroundImage: `url(${form.photoUrl})`,
                    backgroundSize: "cover",
                  }}
                />
              )}
            </>
          )}
          {message && <div className="alert success">{message}</div>}
          {error && <div className="alert error">{error}</div>}
          <button
            className="primary-action"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <RefreshCw className="spin" size={18} />
            ) : (
              <ShieldCheck size={18} />
            )}{" "}
            {mode === "register" ? "Send for admission approval" : "Login"}
          </button>
          <button
            className="mini-action"
            onClick={() => {
              setMode(mode === "register" ? "login" : "register");
              setError("");
            }}
          >
            {mode === "register"
              ? "Already registered? Login"
              : "New student? Register"}
          </button>
        </section>
      </div>
    </main>
  );
}

function IdChecker({ onVerified }: { onVerified: (student: Student) => void }) {
  const [id, setId] = useState("");
  const [result, setResult] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function check() {
    const clean = id.trim().toUpperCase();
    if (!clean) return setError("Student ID enter करें।");
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await api("getStudent", { studentId: clean });
      setResult(response.student);
      onVerified(response.student);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "यह Student ID live backend record में नहीं मिला।",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="checker-layout">
      <section className="checker-hero">
        <div className="checker-icon">
          <ShieldCheck size={38} />
        </div>
        <span className="eyebrow dark">INSTANT VERIFICATION</span>
        <h1>Student ID Checker</h1>
        <p>
          ID type या card scan करके student की identity, batch और access status
          verify करें।
        </p>
        <label>
          <IdCard size={20} />
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="EXAM-1001"
          />
          <button onClick={check}>
            {busy ? (
              <RefreshCw className="spin" size={18} />
            ) : (
              <Search size={18} />
            )}{" "}
            Verify
          </button>
        </label>
        <small>
          Tip: Scanner से मिला ID यहाँ automatically verify हो जाता है।
        </small>
      </section>
      {error && <div className="alert error checker-alert">{error}</div>}
      {result && (
        <section className="verification-card">
          <div className="verified-ribbon">
            <CheckCircle2 size={18} /> VERIFIED & ACTIVE
          </div>
          <div className="verify-profile">
            <span className="student-avatar large">
              {initials(result.studentName)}
            </span>
            <div>
              <small>STUDENT NAME</small>
              <h2>{result.studentName}</h2>
              <p>{result.studentId}</p>
            </div>
            <span className="batch-badge">{result.batch}</span>
          </div>
          <div className="verify-grid">
            <div>
              <span>Registration</span>
              <b>{result.registrationNo}</b>
            </div>
            <div>
              <span>Course</span>
              <b>{result.course}</b>
            </div>
            <div>
              <span>Father&apos;s name</span>
              <b>{result.fatherName || "—"}</b>
            </div>
            <div>
              <span>Fee status</span>
              <b className={result.pendingFee ? "amber-text" : "green-text"}>
                {result.pendingFee
                  ? `${money(result.pendingFee)} due`
                  : "Fully paid"}
              </b>
            </div>
          </div>
          <div className="verify-foot">
            <ShieldCheck size={17} /> Record matched with EXAMPUR student
            database.
          </div>
        </section>
      )}
    </div>
  );
}

function Scanner({
  students,
  session,
  addAttendance,
  verify,
}: {
  students: Student[];
  session: StaffSession;
  addAttendance: (entry: Attendance) => void;
  verify: (student: Student) => void;
}) {
  const [batch, setBatch] = useState("UPSI");
  const [manualId, setManualId] = useState("");
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [confirmedStudent, setConfirmedStudent] = useState<Student | null>(
    null,
  );
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  useEffect(
    () => () => {
      scannerRef.current?.stop().catch(() => {});
    },
    [],
  );
  async function process(raw: string) {
    let studentId = decodeURIComponent(raw.trim()),
      qrBatch = "";
    try {
      const parsed = JSON.parse(studentId);
      studentId = String(parsed.studentId || parsed.id || studentId);
      qrBatch = String(parsed.batch || "");
    } catch {}
    if (/^https?:/i.test(studentId)) {
      try {
        const parsed = new URL(studentId);
        studentId =
          parsed.searchParams.get("studentId") ||
          parsed.searchParams.get("id") ||
          studentId;
        qrBatch = parsed.searchParams.get("batch") || qrBatch;
      } catch {}
    }
    if (studentId.startsWith("EXAMPUR|")) {
      const parts = studentId.split("|");
      studentId = parts[1] || "";
      qrBatch = parts[2] || "";
    }
    studentId = studentId.trim().toUpperCase();
    let student = students.find(
      (item) => item.studentId.toUpperCase() === studentId.toUpperCase(),
    );
    if (!student) {
      try {
        const response = await api("getStudent", { studentId }, 12000);
        student = response.student;
      } catch {}
    }
    if (!student) {
      setConfirmedStudent(null);
      return setMessage({
        type: "error",
        text: "Student ID नहीं मिला। Card या typed ID check करें।",
      });
    }
    setConfirmedStudent(student);
    const attendanceBatch = qrBatch || student.batch || batch;
    if (attendanceBatch !== batch) setBatch(attendanceBatch);
    try {
      await api("markAttendance", {
        studentId,
        batch: attendanceBatch,
        checkerEmail: session.email,
        scanMethod: "QR / ID Scanner",
        deviceId: localStorage.getItem("exampur_device") || crypto.randomUUID(),
      });
      const now = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      addAttendance({
        time: now,
        studentId,
        studentName: student.studentName,
        batch: student.batch,
        checkerEmail: session.email,
        status: "Present",
      });
      verify(student);
      setMessage({
        type: "success",
        text: `${student.studentName} — attendance successfully marked at ${now}.`,
      });
      setManualId("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Attendance mark नहीं हुई।",
      });
    }
  }
  async function stop() {
    try {
      await scannerRef.current?.stop();
      scannerRef.current?.clear();
    } catch {}
    scannerRef.current = null;
    setRunning(false);
  }
  async function start() {
    setMessage(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (text) => {
          await stop();
          await process(text);
        },
        () => {},
      );
      setRunning(true);
    } catch {
      setRunning(false);
      setMessage({
        type: "error",
        text: "Camera start नहीं हुआ। Browser में camera Allow करें या नीचे Student ID type करें।",
      });
    }
  }
  return (
    <div className="scanner-grid">
      <section className="panel scanner-panel">
        <div className="page-title compact">
          <div>
            <span>STUDENT ID CHECKER</span>
            <h1>Scan Student ID QR</h1>
            <p>Card scan होते ही batch verify होगा और attendance mark होगी।</p>
          </div>
          <div className={`camera-state ${running ? "on" : ""}`}>
            <i />
            {running ? "Camera active" : "Camera off"}
          </div>
        </div>
        <div className="batch-tabs">
          {BATCHES.map((item) => (
            <button
              key={item}
              className={batch === item ? "active" : ""}
              onClick={() => setBatch(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className={`camera-box ${running ? "running" : ""}`}>
          <div id="qr-reader" />
          <div className="camera-placeholder">
            <ScanLine size={56} />
            <b>Align QR card inside the frame</b>
            <span>Selected batch: {batch}</span>
          </div>
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
        </div>
        <div className="button-row centered">
          {running ? (
            <button className="danger-button" onClick={stop}>
              <X size={18} /> Stop camera
            </button>
          ) : (
            <button className="filled" onClick={start}>
              <Camera size={18} /> Start camera scanner
            </button>
          )}
        </div>
      </section>
      <section className="panel manual-panel">
        <div className="manual-icon">
          <IdCard size={27} />
        </div>
        <h2>Manual ID entry</h2>
        <p>
          Camera available न हो तो Student ID type करके attendance mark करें।
        </p>
        <label>
          Student ID
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && process(manualId)}
            placeholder="EXAM-1001"
          />
        </label>
        <button className="primary-action" onClick={() => process(manualId)}>
          <UserCheck size={18} /> Verify & mark present
        </button>
        {message && (
          <div className={`scan-message ${message.type}`}>
            {message.type === "success" ? (
              <CheckCircle2 size={22} />
            ) : (
              <X size={22} />
            )}
            <span>{message.text}</span>
          </div>
        )}
        {confirmedStudent && (
          <div
            className={`scan-student-card ${message?.type === "success" ? "verified" : "blocked"}`}
          >
            <div className="scan-student-photo">
              {confirmedStudent.photoUrl ? (
                <span
                  role="img"
                  aria-label={confirmedStudent.studentName}
                  style={{
                    backgroundImage: `url(${confirmedStudent.photoUrl})`,
                  }}
                />
              ) : (
                initials(confirmedStudent.studentName)
              )}
            </div>
            <div>
              <small>
                {message?.type === "success"
                  ? "ATTENDANCE CONFIRMED"
                  : "STUDENT MATCHED"}
              </small>
              <b>{confirmedStudent.studentName}</b>
              <span>{confirmedStudent.studentId}</span>
              <em>
                {confirmedStudent.batch} · {confirmedStudent.course}
              </em>
            </div>
            <ShieldCheck size={21} />
          </div>
        )}
        <div className="scan-guide">
          <b>3-step safety check</b>
          <span>
            <i>1</i> Student ID exists
          </span>
          <span>
            <i>2</i> Selected batch matches
          </span>
          <span>
            <i>3</i> Duplicate attendance blocked
          </span>
        </div>
      </section>
    </div>
  );
}

function TimetablePanel({
  slots,
  setSlots,
  canEdit,
}: {
  slots: TimeSlot[];
  setSlots: React.Dispatch<React.SetStateAction<TimeSlot[]>>;
  canEdit: boolean;
}) {
  const [batch, setBatch] = useState("UPSI");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TimeSlot>({
    batch: "UPSI",
    day: "Monday",
    startTime: "07:00",
    endTime: "08:00",
    subject: "",
    teacher: "",
    room: "Hall A",
    classStatus: "Scheduled",
  });
  const visible = slots.filter((slot) => slot.batch === batch);
  function overlaps(first: TimeSlot, second: TimeSlot) {
    return first.startTime < second.endTime && second.startTime < first.endTime;
  }
  const clashes = slots.filter((slot, index) =>
    slots.some(
      (other, otherIndex) =>
        otherIndex > index &&
        slot.day === other.day &&
        overlaps(slot, other) &&
        ((slot.room && slot.room === other.room) ||
          (slot.teacher && slot.teacher === other.teacher)),
    ),
  );
  async function save() {
    if (!form.subject.trim()) return setError("Subject is required.");
    if (form.endTime <= form.startTime)
      return setError("End time must be after start time.");
    const conflict = slots.find(
      (slot) =>
        slot.day === form.day &&
        overlaps(slot, form) &&
        ((form.room && slot.room === form.room) ||
          (form.teacher && slot.teacher === form.teacher)),
    );
    if (conflict)
      return setError(
        `Clash detected: ${conflict.subject} is already scheduled ${conflict.startTime}–${conflict.endTime} in ${conflict.room || "the same room"}.`,
      );
    setBusy(true);
    setError("");
    try {
      const result = await api("saveTimetable", { ...form, batch });
      const slot = { ...form, batch, timetableId: result.timetableId };
      setSlots((current) => [...current, slot]);
      setOpen(false);
      setForm({ ...form, subject: "", teacher: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Timetable could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(slot: TimeSlot) {
    if (!slot.timetableId || !window.confirm("Delete this timetable class?"))
      return;
    setBusy(true);
    setError("");
    try {
      await api("deleteTimetable", { timetableId: slot.timetableId });
      setSlots((current) =>
        current.filter((item) => item.timetableId !== slot.timetableId),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Timetable class could not be deleted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel timetable-panel">
      <div className="page-title">
        <div>
          <span>WEEKLY SCHEDULE</span>
          <h1>Batch timetable</h1>
          <p>Create, review and manage every class from one screen.</p>
        </div>
        {canEdit && (
          <button
            className="filled"
            onClick={() => {
              setOpen(true);
              setError("");
            }}
          >
            <Plus size={18} /> Add class
          </button>
        )}
      </div>
      {error && <div className="alert error table-alert">{error}</div>}
      {clashes.length > 0 && (
        <div className="alert error table-alert">
          <Bell size={16} /> {clashes.length} timetable clash{clashes.length > 1 ? "es" : ""} found. Same teacher or room cannot overlap.
        </div>
      )}
      <div className="batch-tabs schedule">
        {BATCHES.map((item) => (
          <button
            key={item}
            className={batch === item ? "active" : ""}
            onClick={() => setBatch(item)}
          >
            {item}
            <small>
              {slots.filter((slot) => slot.batch === item).length} classes
            </small>
          </button>
        ))}
      </div>
      <div className="week-grid">
        {DAYS.map((day) => (
          <div className="day-column" key={day}>
            <div className="day-head">
              <b>{day}</b>
              <span>{visible.filter((slot) => slot.day === day).length}</span>
            </div>
            <div className="day-slots">
              {visible
                .filter((slot) => slot.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((slot) => (
                  <article
                    key={slot.timetableId || slot.day + "-" + slot.startTime}
                    className={slot.isCancelled ? "cancelled" : ""}
                  >
                    <div>
                      <span>
                        {slot.startTime} – {slot.endTime}
                      </span>
                      {canEdit && (
                        <button
                          disabled={busy}
                          onClick={() => void remove(slot)}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <h4>{slot.subject}</h4>
                    <p>{slot.teacher || "Teacher TBA"}</p>
                    <small>
                      <Clock3 size={13} />
                      {slot.room || "Room TBA"}
                    </small>
                  </article>
                ))}
              {visible.filter((slot) => slot.day === day).length === 0 && (
                <div className="no-class">No class</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {open && (
        <div className="modal-backdrop">
          <div className="modal-card timetable-modal">
            <button className="modal-close" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            <span className="eyebrow dark">NEW CLASS</span>
            <h2>Add timetable slot</h2>
            <div className="form-grid">
              <label>
                Batch
                <select
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                >
                  {BATCHES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Day
                <select
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                >
                  {DAYS.map((day) => (
                    <option key={day}>{day}</option>
                  ))}
                </select>
              </label>
              <label>
                Start time
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </label>
              <label>
                End time
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </label>
              <label className="full">
                Subject
                <input
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                  placeholder="e.g. Current Affairs"
                />
              </label>
              <label>
                Teacher
                <input
                  value={form.teacher}
                  onChange={(e) =>
                    setForm({ ...form, teacher: e.target.value })
                  }
                  placeholder="Teacher name"
                />
              </label>
              <label>
                Room
                <input
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="Hall A"
                />
              </label>
            </div>
            {error && <div className="alert error">{error}</div>}
            <button className="primary-action" disabled={busy} onClick={save}>
              {busy ? (
                <RefreshCw className="spin" size={18} />
              ) : (
                <CalendarDays size={18} />
              )}{" "}
              {busy ? "Saving..." : "Save class"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AttendancePanel({ attendance }: { attendance: Attendance[] }) {
  const byBatch = BATCHES.map((batch) => ({
    batch,
    count: attendance.filter((item) => item.batch === batch).length,
  }));
  return (
    <div className="tab-stack">
      <section className="stats-grid small">
        <StatCard
          label="Present scans"
          value={attendance.length.toString()}
          note="Recorded today"
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          label="Active batches"
          value={byBatch.filter((item) => item.count > 0).length.toString()}
          note="With attendance today"
          icon={Clock3}
          tone="blue"
        />
        <StatCard
          label="QR scans"
          value={attendance
            .filter((item) => /qr|camera/i.test(item.scanMethod || ""))
            .length.toString()}
          note="Camera / QR verified"
          icon={QrCode}
          tone="purple"
        />
        <StatCard
          label="Manual entries"
          value={attendance
            .filter((item) => /manual/i.test(item.scanMethod || ""))
            .length.toString()}
          note="Manual ID verified"
          icon={IdCard}
          tone="orange"
        />
      </section>
      <section className="attendance-layout">
        <article className="panel chart-panel">
          <div className="panel-head">
            <div>
              <span>BATCH ATTENDANCE</span>
              <h3>Today by batch</h3>
            </div>
          </div>
          <div className="bar-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBatch}>
                <CartesianGrid stroke="#edf0f5" vertical={false} />
                <XAxis dataKey="batch" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#5b46e8"
                  radius={[8, 8, 2, 2]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel table-panel compact-table">
          <div className="panel-head">
            <div>
              <span>SCAN LOG</span>
              <h3>Recent attendance</h3>
            </div>
            <button onClick={() => window.print()}>
              <Download size={16} /> Export / Print
            </button>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((entry, index) => (
                  <tr key={`${entry.studentId}-${index}`}>
                    <td>{entry.time}</td>
                    <td>
                      <div className="student-cell">
                        <span className="student-avatar">
                          {initials(entry.studentName)}
                        </span>
                        <span>
                          <b>{entry.studentName}</b>
                          <small>{entry.studentId}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="batch-badge">{entry.batch}</span>
                    </td>
                    <td>
                      <span className="status active">
                        <i /> Present
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
function FeesPanel({
  students,
  onReload,
  session,
  onActivity,
}: {
  students: Student[];
  onReload: () => Promise<void>;
  session: StaffSession;
  onActivity: (text: string) => void;
}) {
  const due = students.filter((student) => student.pendingFee > 0);
  const [selected, setSelected] = useState<Student | null>(null),
    [amount, setAmount] = useState(""),
    [mode, setMode] = useState("Cash"),
    [nextDueDate, setNextDueDate] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<{ student: Student; amount: number; mode: string; time: string } | null>(null);
  function printReceipt() {
    if (!receipt) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=740,height=820");
    if (!popup) return setError("Receipt window blocked हुई है। Browser popup allow करें।");
    popup.document.write(`<!doctype html><html><head><title>EXAMPUR Fee Receipt</title><style>body{font-family:Arial;padding:38px;color:#172b52}.box{border:2px solid #5b46e8;border-radius:14px;padding:28px}h1{margin:0;color:#5b46e8}table{width:100%;border-collapse:collapse;margin-top:20px}td{padding:11px;border-bottom:1px solid #dbe4f5}td:last-child{text-align:right;font-weight:700}</style></head><body><div class="box"><h1>EXAMPUR Offline</h1><p>Fee Payment Receipt</p><table><tr><td>Student</td><td>${receipt.student.studentName}</td></tr><tr><td>Student ID</td><td>${receipt.student.studentId}</td></tr><tr><td>Course / Batch</td><td>${receipt.student.course} / ${receipt.student.batch}</td></tr><tr><td>Amount received</td><td>${money(receipt.amount)}</td></tr><tr><td>Payment mode</td><td>${receipt.mode}</td></tr><tr><td>Received on</td><td>${receipt.time}</td></tr><tr><td>Collected by</td><td>${session.name}</td></tr></table><p>Thank you for choosing EXAMPUR.</p></div><script>window.print()<\/script></body></html>`);
    popup.document.close();
  }
  async function collect() {
    const value = Number(amount);
    if (!selected) return setError("Select a student.");
    if (!Number.isFinite(value) || value <= 0)
      return setError("Enter a valid payment amount.");
    if (selected.pendingFee > 0 && value > selected.pendingFee)
      return setError("Payment cannot be greater than the pending fee.");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(
        "addFee",
        {
          studentId: selected.studentId,
          amount: value,
          mode,
          nextDueDate,
          collectedBy: session.email,
        },
        12000,
      );
      setMessage("Fee payment saved successfully.");
      setReceipt({ student: selected, amount: value, mode, time: new Date().toLocaleString("en-IN") });
      onActivity(`Fee collected from ${selected.studentName}: ${money(value)}`);
      setSelected(null);
      setAmount("");
      await onReload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fee payment could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function allotBooks(student: Student) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("markBooksAllotted", { studentId: student.studentId }, 12000);
      setMessage(`Books allotted for ${student.studentName}.`);
      await onReload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Books could not be allotted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel table-panel">
      <div className="page-title">
        <div>
          <span>FEE CONTROL</span>
          <h1>Fees & pending dues</h1>
          <p>Track collections and follow up the next due date.</p>
        </div>
        <button
          className="filled"
          disabled={due.length === 0}
          onClick={() => setSelected(due[0] || null)}
        >
          <CircleIndianRupee size={18} /> Collect fee
        </button>
      </div>
      {error && <div className="alert error table-alert">{error}</div>}
      {receipt && (
        <div className="receipt-ready">
          <CheckCircle2 size={18} /> Receipt ready for <b>{receipt.student.studentName}</b>
          <button className="mini-action" onClick={printReceipt}><Printer size={15} /> Print / Save Receipt</button>
        </div>
      )}
      {message && <div className="alert success table-alert">{message}</div>}
      <div className="fees-summary">
        <div>
          <CircleIndianRupee size={22} />
          <span>
            Collected from shown students
            <b>
              {money(
                students.reduce((sum, student) => sum + student.paidFee, 0),
              )}
            </b>
          </span>
        </div>
        <div>
          <WalletCards size={22} />
          <span>
            Total pending
            <b>
              {money(
                students.reduce((sum, student) => sum + student.pendingFee, 0),
              )}
            </b>
          </span>
        </div>
        <div>
          <CalendarDays size={22} />
          <span>
            Follow-ups needed<b>{due.length}</b>
          </span>
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Total fee</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Next due</th>
              <th>Books</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.studentId}>
                <td>
                  <div className="student-cell">
                    <span className="student-avatar">
                      {initials(student.studentName)}
                    </span>
                    <span>
                      <b>{student.studentName}</b>
                      <small>{student.studentId}</small>
                    </span>
                  </div>
                </td>
                <td>{money(student.totalFee)}</td>
                <td className="green-text">{money(student.paidFee)}</td>
                <td
                  className={student.pendingFee ? "amber-text" : "green-text"}
                >
                  {money(student.pendingFee)}
                </td>
                <td>{student.nextDueDate || "—"}</td>
                <td>
                  {student.booksAllotted ? (
                    <span className="status active">
                      <i /> Books allotted
                    </span>
                  ) : student.pendingFee <= 0 ? (
                    <button
                      className="approve"
                      disabled={busy}
                      onClick={() => void allotBooks(student)}
                    >
                      <CheckCircle2 size={15} /> Allot books
                    </button>
                  ) : (
                    <span className="login-missing">Full fee required</span>
                  )}
                </td>
                <td>
                  <button
                    className="mini-action"
                    disabled={student.pendingFee <= 0}
                    onClick={() => {
                      setSelected(student);
                      setAmount("");
                      setError("");
                    }}
                  >
                    Collect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="empty-state">
            <WalletCards size={30} />
            <b>No student fee records</b>
          </div>
        )}
      </div>
      {selected && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setSelected(null)}>
              <X size={20} />
            </button>
            <span className="eyebrow dark">FEE PAYMENT</span>
            <h2>{selected.studentName}</h2>
            <p className="form-intro">Pending: {money(selected.pendingFee)}</p>
            <div className="form-grid one">
              <label>
                Amount *
                <input
                  type="number"
                  min="1"
                  max={selected.pendingFee || undefined}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                Payment mode
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                </select>
              </label>
              <label>
                Next due date
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </label>
            </div>
            {error && <div className="alert error">{error}</div>}
            <button
              className="primary-action"
              disabled={busy}
              onClick={collect}
            >
              {busy ? (
                <RefreshCw className="spin" size={18} />
              ) : (
                <CircleIndianRupee size={18} />
              )}{" "}
              {busy ? "Saving..." : "Save payment"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AccessRequestsPanel({
  session,
  onChanged,
}: {
  session: StaffSession;
  onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<StaffRequest[]>([]),
    [filter, setFilter] = useState("Pending"),
    [scope, setScope] = useState<"Counselors" | "All">("Counselors"),
    [busyEmail, setBusyEmail] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [roleEdits, setRoleEdits] = useState<Record<string, Role>>({});
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api("listStaffRequests", {
        adminEmail: session.email,
        authToken: session.authToken || "",
      });
      setRows((result.rows || []).reverse());
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Approval requests could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [session.authToken, session.email]);
  useEffect(() => {
    const first = window.setTimeout(() => {
      void load();
    }, 0);
    const timer = window.setInterval(() => {
      void load();
    }, 4000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [load]);
  async function decide(
    row: StaffRequest,
    action: "approveStaff" | "rejectStaff" | "holdStaff",
  ) {
    if (
      action === "rejectStaff" &&
      !window.confirm(
        "Reject access request for " + (row.name || row.email) + "?",
      )
    )
      return;
    setBusyEmail(row.email);
    setError("");
    try {
      await api(action, {
        email: row.email,
        role: roleEdits[row.email] || row.requestedRole,
        approvedBy: session.email,
        authToken: session.authToken || "",
      });
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Approval action could not be completed.",
      );
    } finally {
      setBusyEmail("");
    }
  }
  const scoped =
    scope === "All"
      ? rows
      : rows.filter(
          (row) =>
            row.requestedRole === "Counselor" ||
            row.approvedRole === "Counselor",
        );
  const counts = {
    Pending: scoped.filter((row) => row.status === "Pending").length,
    Approved: scoped.filter((row) => row.status === "Approved").length,
    Rejected: scoped.filter((row) => row.status === "Rejected").length,
  };
  const visible =
    filter === "All" ? scoped : scoped.filter((row) => row.status === filter);
  return (
    <section className="panel access-panel">
      <div className="page-title">
        <div>
          <span>ADMIN PORTAL</span>
          <h1>Counsellor Login Approvals</h1>
          <p>
            New counsellor requests हर 4 seconds में live backend से दिखाई
            देंगी।
          </p>
        </div>
        <button
          className="filled"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "spin" : ""} size={18} /> Refresh now
        </button>
      </div>
      <div className="scope-switch">
        <button
          className={scope === "Counselors" ? "active" : ""}
          onClick={() => setScope("Counselors")}
        >
          Counsellors
        </button>
        <button
          className={scope === "All" ? "active" : ""}
          onClick={() => setScope("All")}
        >
          All staff roles
        </button>
      </div>
      <div className="approval-stats">
        <button
          className={filter === "Pending" ? "active" : ""}
          onClick={() => setFilter("Pending")}
        >
          <span>Pending</span>
          <b>{counts.Pending}</b>
          <small>Need action</small>
        </button>
        <button
          className={filter === "Approved" ? "active" : ""}
          onClick={() => setFilter("Approved")}
        >
          <span>Approved</span>
          <b>{counts.Approved}</b>
          <small>Active access</small>
        </button>
        <button
          className={filter === "Rejected" ? "active" : ""}
          onClick={() => setFilter("Rejected")}
        >
          <span>Rejected</span>
          <b>{counts.Rejected}</b>
          <small>Access denied</small>
        </button>
        <button
          className={filter === "All" ? "active" : ""}
          onClick={() => setFilter("All")}
        >
          <span>All requests</span>
          <b>{scoped.length}</b>
          <small>Complete list</small>
        </button>
      </div>
      {error && (
        <div className="alert error access-error">
          {error}
          <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      <div className="data-table-wrap">
        <table className="data-table access-table">
          <thead>
            <tr>
              <th>Counsellor / staff</th>
              <th>Counsellor ID</th>
              <th>Mobile</th>
              <th>Requested role</th>
              <th>Request date/time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.email}>
                <td>
                  <div className="student-cell">
                    <span className="student-avatar">
                      {initials(row.name || "Staff")}
                    </span>
                    <span>
                      <b>{row.name || "Unnamed staff"}</b>
                      <small>{row.email || "—"}</small>
                    </span>
                  </div>
                </td>
                <td>
                  <code>
                    {row.counselorId ||
                      (row.requestedRole === "Counselor"
                        ? "Assigning..."
                        : "—")}
                  </code>
                </td>
                <td>{row.mobile ? "+91 " + row.mobile : "—"}</td>
                <td>
                  <select
                    value={
                      roleEdits[row.email] ||
                      row.approvedRole ||
                      row.requestedRole
                    }
                    onChange={(e) =>
                      setRoleEdits((current) => ({
                        ...current,
                        [row.email]: e.target.value as Role,
                      }))
                    }
                    disabled={row.status === "Approved"}
                  >
                    {roleChoices.map((item) => (
                      <option key={item.role}>{item.role}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <small className="request-time">
                    {row.requestedAt
                      ? new Date(
                          String(row.requestedAt).replace(" ", "T"),
                        ).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </small>
                </td>
                <td>
                  <span
                    className={
                      "request-status " +
                      row.status.toLowerCase().replace(" ", "-")
                    }
                  >
                    <i /> {row.status}
                  </span>
                </td>
                <td>
                  {row.status === "Pending" || row.status === "On Hold" ? (
                    <div className="request-actions">
                      <button
                        className="approve"
                        disabled={busyEmail === row.email}
                        onClick={() => decide(row, "approveStaff")}
                      >
                        <CheckCircle2 size={15} /> Approve
                      </button>
                      <button
                        className="hold"
                        disabled={busyEmail === row.email}
                        onClick={() => decide(row, "holdStaff")}
                      >
                        Hold
                      </button>
                      <button
                        className="reject"
                        disabled={busyEmail === row.email}
                        onClick={() => decide(row, "rejectStaff")}
                      >
                        <X size={15} /> Reject
                      </button>
                    </div>
                  ) : (
                    <span className="decision-done">
                      <ShieldCheck size={15} />{" "}
                      {row.approvedRole || row.requestedRole}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && rows.length === 0 && (
          <div className="empty-state">
            <RefreshCw className="spin" size={30} />
            <b>Loading approval requests...</b>
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="empty-state">
            <UserCheck size={30} />
            <b>No {filter.toLowerCase()} requests</b>
            <span>New registration आते ही यहाँ दिखाई देगी।</span>
          </div>
        )}
      </div>
    </section>
  );
}

function CentreAI({
  dashboard,
  students,
  attendance,
  close,
}: {
  dashboard: Dashboard;
  students: Student[];
  attendance: Attendance[];
  close: () => void;
}) {
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState(
      "आज की report के बारे में type करें या mic दबाकर बोलें।",
    ),
    [listening, setListening] = useState(false);
  function dateKey(value: string) {
    return String(value || "").slice(0, 10);
  }
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date();
  next.setDate(next.getDate() + 1);
  const tomorrow = next.toISOString().slice(0, 10);
  function ask(text = question) {
    const q = text.trim().toLowerCase();
    if (!q) return;
    const dues = students.filter((s) => s.pendingFee > 0 && s.nextDueDate);
    const names = (rows: Student[]) =>
      rows.length
        ? rows
            .slice(0, 10)
            .map((s) => `${s.studentName} (${money(s.pendingFee)})`)
            .join(", ")
        : "कोई student नहीं";
    let reply =
      "मैं students, attendance, collection और fee dues की live dashboard जानकारी बता सकता हूँ।";
    if (/overdue|लेट|बकाया/.test(q))
      reply = `Overdue fee: ${names(dues.filter((s) => dateKey(s.nextDueDate) < today))}`;
    else if (/कल|tomorrow/.test(q))
      reply = `कल fee due: ${names(dues.filter((s) => dateKey(s.nextDueDate) === tomorrow))}`;
    else if (/due|ड्यू|आज.*fee|फीस/.test(q))
      reply = `आज fee due: ${names(dues.filter((s) => dateKey(s.nextDueDate) === today))}`;
    else if (/present|attendance|हाजिर|अटेंडेंस/.test(q))
      reply = `आज ${attendance.length || dashboard.presentStudents} students present हैं।`;
    else if (/collection|कलेक्शन/.test(q))
      reply = `आज का recorded collection ${money(dashboard.todayCollection)} है।`;
    else if (/admission|एडमिशन/.test(q))
      reply = `आज ${dashboard.todayAdmissions} admissions हुए हैं। Total students ${dashboard.approvedStudents} हैं।`;
    else if (/approval|अप्रूवल|pending registration/.test(q))
      reply = `Pending student approvals: ${students.filter((s) => s.approvalStatus === "Pending").length}. Student Admission page से approve करें।`;
    else if (/percent|प्रतिशत|percentage/.test(q))
      reply = `आज attendance rate ${dashboard.approvedStudents ? Math.round(((attendance.length || dashboard.presentStudents) / dashboard.approvedStudents) * 100) : 0}% है।`;
    else if (/student|स्टूडेंट/.test(q))
      reply = `Total active students: ${dashboard.approvedStudents}.`;
    setAnswer(reply);
  }
  function speak() {
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: (event: {
              results: { 0: { transcript: string } }[];
            }) => void;
            onerror: () => void;
            onend: () => void;
            start: () => void;
          };
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => {
            lang: string;
            interimResults: boolean;
            onresult: (event: {
              results: { 0: { transcript: string } }[];
            }) => void;
            onerror: () => void;
            onend: () => void;
            start: () => void;
          };
        }
      ).webkitSpeechRecognition;
    if (!SpeechRecognition)
      return setAnswer(
        "इस browser में voice typing support नहीं है। आप नीचे type करके पूछ सकते हैं।",
      );
    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setQuestion(text);
      ask(text);
    };
    recognition.onerror = () =>
      setAnswer("Voice सुनाई नहीं दी। Mic permission check करें या type करें।");
    recognition.onend = () => setListening(false);
    recognition.start();
  }
  return (
    <div className="modal-backdrop">
      <section className="modal-card centre-ai-modal">
        <button className="modal-close" onClick={close}>
          <X size={20} />
        </button>
        <span className="eyebrow dark">
          <Sparkles size={15} /> CENTRE AI
        </span>
        <h2>Type या बोलकर पूछें</h2>
        <div className="ai-answer">{answer}</div>
        <label>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="जैसे: आज किसकी fee due है?"
          />
          <button
            className={listening ? "listening" : ""}
            onClick={speak}
            title="Speak"
          >
            <Mic size={19} />
          </button>
          <button onClick={() => ask()} title="Send">
            <Send size={19} />
          </button>
        </label>
        <div className="ai-quick">
          <button onClick={() => ask("आज fee due")}>आज की fee</button>
          <button onClick={() => ask("overdue fee")}>Overdue</button>
          <button onClick={() => ask("आज attendance")}>Attendance</button>
          <button onClick={() => ask("आज collection")}>Collection</button>
          <button onClick={() => ask("pending approval")}>Approvals</button>
        </div>
      </section>
    </div>
  );
}

function DashboardApp({
  session,
  logout,
}: {
  session: StaffSession;
  logout: () => void;
}) {
  const [active, setActiveState] = useState<Tab>("overview"),
    [menuOpen, setMenuOpen] = useState(false),
    [dashboard, setDashboard] = useState(initialDashboard),
    [students, setStudents] = useState<Student[]>([]),
    [attendance, setAttendance] = useState<Attendance[]>([]),
    [slots, setSlots] = useState<TimeSlot[]>([]),
    [selected, setSelected] = useState<Student | null>(null),
    [counselors, setCounselors] = useState<Counselor[]>([]),
    [selectedCounselor, setSelectedCounselor] = useState<Counselor | null>(
      null,
    ),
    [counselorsLoading, setCounselorsLoading] = useState(false),
    [counselorError, setCounselorError] = useState(""),
    [live, setLive] = useState(false),
    [lastSynced, setLastSynced] = useState(""),
    [loadError, setLoadError] = useState(""),
    [modalStudent, setModalStudent] = useState<Student | null>(null),
    [aiOpen, setAiOpen] = useState(false),
    [activities, setActivities] = useState<ActivityItem[]>([]);

  const recordActivity = useCallback((text: string) => {
    const item = { id: `${Date.now()}-${Math.random()}`, text, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) };
    setActivities((current) => {
      const next = [item, ...current].slice(0, 20);
      localStorage.setItem("exampur_admin_activity", JSON.stringify(next));
      return next;
    });
  }, []);

  const setActive = useCallback((tab: Tab) => {
    setActiveState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({ tab }, "", url);
  }, []);

  const loadCounselors = useCallback(async () => {
    if (!["Admin", "Super Admin", "Counselor"].includes(session.role)) return;
    setCounselorsLoading(true);
    setCounselorError("");
    try {
      const result = await api("listCounselors");
      const rows = (result.rows || []) as Counselor[];
      setCounselors(rows);
      if (!selectedCounselor && rows.length)
        setSelectedCounselor(
          session.role === "Counselor"
            ? rows.find((row) => row.email === session.email) || rows[0]
            : rows[0],
        );
    } catch (err) {
      setCounselorError(
        err instanceof Error
          ? err.message
          : "Counsellor records could not be loaded.",
      );
    } finally {
      setCounselorsLoading(false);
    }
  }, [selectedCounselor, session.email, session.role]);

  const loadLive = useCallback(
    async function loadLiveData() {
      setLoadError("");
      try {
        const dashRequest = api("getDashboard");
        const studentRequest = api("listStudents");
        const dash = await dashRequest;
        setDashboard({ ...initialDashboard, ...dash });
        setLive(true);
        setLastSynced(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
        const studentData = await studentRequest;
        const rows = ((studentData.rows || []) as Student[]).map((student) => ({
          ...student,
          photoUrl:
            localStorage.getItem(studentPhotoKey(student.studentId)) ||
            student.photoUrl,
        }));
        setStudents(rows);
        setSelected(
          (current) =>
            rows.find((row) => row.studentId === current?.studentId) ||
            rows[0] ||
            null,
        );
        if (["Admin", "Super Admin", "Batch Checker"].includes(session.role)) {
          const attendanceData = await api("listAttendance", {
            date: new Date().toISOString().slice(0, 10),
          });
          setAttendance((attendanceData.rows || []).reverse());
        } else setAttendance([]);
        setLive(true);
      } catch (err) {
        setLive(false);
        setLoadError(
          err instanceof Error
            ? err.message
            : "Live backend data could not be loaded.",
        );
      }
    },
    [session.role],
  );

  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get(
      "tab",
    ) as Tab | null;
    const first = window.setTimeout(() => {
      if (
        queryTab &&
        navItems.some(
          (item) =>
            item.id === queryTab &&
            (!item.roles || item.roles.includes(session.role)),
        )
      )
        setActiveState(queryTab);
    }, 0);
    const onPop = () => {
      const tab = new URLSearchParams(window.location.search).get(
        "tab",
      ) as Tab | null;
      if (
        tab &&
        navItems.some(
          (item) =>
            item.id === tab &&
            (!item.roles || item.roles.includes(session.role)),
        )
      )
        setActiveState(tab);
      else setActiveState("overview");
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener("popstate", onPop);
    };
  }, [session.role]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("exampur_admin_activity") || "[]");
      if (Array.isArray(saved)) setActivities(saved);
    } catch {}
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLive();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadLive]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (active === "counselors" || active === "counselorcard")
        void loadCounselors();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, loadCounselors]);
  useEffect(() => {
    if (active !== "timetable") return;
    Promise.all(BATCHES.map((batch) => api("getTimetable", { batch })))
      .then((results) => {
        setSlots(results.flatMap((result) => result.rows || []));
        setLoadError("");
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : "Timetable could not be loaded.",
        ),
      );
  }, [active]);

  function chooseStudent(student: Student) {
    setSelected(student);
    setModalStudent(student);
  }
  function addAttendance(entry: Attendance) {
    setAttendance((current) => [
      entry,
      ...current.filter((item) => item.studentId !== entry.studentId),
    ]);
    setDashboard((current) => ({
      ...current,
      presentStudents: current.presentStudents + 1,
    }));
    recordActivity(`Attendance marked for ${entry.studentName}`);
  }
  function changeStudentPhoto(studentId: string, photoUrl: string) {
    const applyPhoto = (student: Student) =>
      student.studentId === studentId ? { ...student, photoUrl } : student;
    setStudents((current) => current.map(applyPhoto));
    setSelected((current) => (current ? applyPhoto(current) : current));
    setModalStudent((current) => (current ? applyPhoto(current) : current));
  }
  function openCounselorCard(row: Counselor) {
    setSelectedCounselor(row);
    setActive("counselorcard");
  }

  const pendingAdmissions = students.filter((student) => student.approvalStatus === "Pending").length;
  const overdueFees = students.filter((student) => student.pendingFee > 0 && String(student.nextDueDate || "").slice(0, 10) < new Date().toISOString().slice(0, 10)).length;
  const attendanceRate = dashboard.approvedStudents ? Math.min(100, Math.round((dashboard.presentStudents / dashboard.approvedStudents) * 100)) : 0;
  const notifications = [
    ...(pendingAdmissions ? [`${pendingAdmissions} student admission approval pending`] : []),
    ...(overdueFees ? [`${overdueFees} overdue fee follow-ups need attention`] : []),
  ];

  return (
    <div className="dashboard-shell">
      <Sidebar
        active={active}
        setActive={setActive}
        session={session}
        open={menuOpen}
        close={() => setMenuOpen(false)}
        logout={logout}
        askAI={() => {
          setAiOpen(true);
          setMenuOpen(false);
        }}
      />
      {menuOpen && (
        <button className="mobile-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <main className="dashboard-main">
        <Header
          session={session}
          menu={() => setMenuOpen(true)}
          sync={() => { recordActivity("Dashboard manually refreshed"); void loadLive(); }}
          live={live}
          lastSynced={lastSynced}
          notifications={notifications}
        />
        <div className="mobile-page-title">
          {navItems.find((item) => item.id === active)?.label || "Overview"}
        </div>
        <div className="content-area">
          {loadError && (
            <div className="alert error global-sync-error">
              <span>{loadError}</span>
              <button onClick={() => void loadLive()}>
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          )}
          {active === "overview" && (
            <Overview
              dashboard={dashboard}
              students={students}
              attendance={attendance}
              setActive={setActive}
              selectStudent={chooseStudent}
              attendanceRate={attendanceRate}
              pendingAdmissions={pendingAdmissions}
              activities={activities}
            />
          )}
          {active === "students" && (
            <StudentsPanel
              students={students}
              onSelect={chooseStudent}
              onReload={loadLive}
              session={session}
              onActivity={recordActivity}
            />
          )}
          {active === "idcards" && (
            <IdCardStudio
              students={students}
              selected={selected}
              setSelected={setSelected}
              onPhotoChange={changeStudentPhoto}
            />
          )}
          {active === "counselors" && (
            <CounselorDirectory
              rows={counselors}
              loading={counselorsLoading}
              error={counselorError}
              onRefresh={loadCounselors}
              onSelect={openCounselorCard}
            />
          )}
          {active === "counselorcard" && (
            <CounselorIdCardPanel
              selected={selectedCounselor}
              session={session}
            />
          )}
          {active === "checker" && (
            <div className="tab-stack">
              <IdChecker onVerified={setSelected} />
              {["Admin", "Super Admin", "Batch Checker"].includes(
                session.role,
              ) && (
                <Scanner
                  students={students}
                  session={session}
                  addAttendance={addAttendance}
                  verify={setSelected}
                />
              )}
            </div>
          )}
          {active === "timetable" && (
            <TimetablePanel
              slots={slots}
              setSlots={setSlots}
              canEdit={["Admin", "Super Admin", "Batch Checker"].includes(
                session.role,
              )}
            />
          )}
          {active === "attendance" && (
            <AttendancePanel attendance={attendance} />
          )}
          {active === "fees" && (
            <FeesPanel
              students={students}
              onReload={loadLive}
              session={session}
              onActivity={recordActivity}
            />
          )}
          {active === "access" && (
            <AccessRequestsPanel session={session} onChanged={loadLive} />
          )}
        </div>
      </main>
      {modalStudent && (
        <div className="modal-backdrop">
          <div className="modal-card id-modal">
            <button
              className="modal-close"
              onClick={() => setModalStudent(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow dark">VERIFIED STUDENT</span>
            <h2>{modalStudent.studentName}</h2>
            <StudentCard student={modalStudent} />
            <div className="button-row centered">
              <button
                onClick={() => {
                  setModalStudent(null);
                  setActive("checker");
                }}
              >
                <ShieldCheck size={17} /> Open checker
              </button>
              <button
                className="filled"
                onClick={() => {
                  setModalStudent(null);
                  setActive("idcards");
                }}
              >
                <IdCard size={17} /> Student ID Card
              </button>
            </div>
          </div>
        </div>
      )}
      {aiOpen && (
        <CentreAI
          dashboard={dashboard}
          students={students}
          attendance={attendance}
          close={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}

export default function Home() {
  const [ready, setReady] = useState(false),
    [session, setSession] = useState<StaffSession | null>(null);
  const [studentToken, setStudentToken] = useState("");
  const [studentRegister, setStudentRegister] = useState(false);
  const [registrationCounselor, setRegistrationCounselor] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const rawToken = params.get("studentToken") || "";
      setStudentToken(
        ["undefined", "null", ""].includes(rawToken.toLowerCase())
          ? ""
          : rawToken,
      );
      setStudentRegister(params.get("studentRegister") === "1");
      setRegistrationCounselor(params.get("counselor") || "");
      try {
        const saved = JSON.parse(
          localStorage.getItem(SESSION_KEY) || "null",
        ) as StaffSession | null;
        setSession(
          saved?.status === "Approved" && !saved.authToken ? null : saved,
        );
      } catch {}
      setReady(true);
    }, 0);
    const expired = () => setSession(null);
    window.addEventListener("exampur-session-expired", expired);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("exampur-session-expired", expired);
    };
  }, []);
  function logout() {
    if (session?.authToken)
      void api("logoutStaff", { authToken: session.authToken }).catch(
        () => undefined,
      );
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("exampur_staff_v5");
    setSession(null);
  }
  if (!ready)
    return (
      <div className="boot-screen">
        <Brand />
        <RefreshCw className="spin" />
      </div>
    );
  if (studentToken) return <StudentPortal token={studentToken} />;
  if (studentRegister)
    return <StudentRegistration counselorEmail={registrationCounselor} />;
  if (!session) return <Login onLogin={setSession} />;
  if (session.status !== "Approved")
    return <PendingApproval session={session} logout={logout} />;
  return <DashboardApp session={session} logout={logout} />;
}
