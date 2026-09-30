import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays as dateAddDays,
  differenceInCalendarDays,
  format,
  subDays,
} from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Activity as ActivityIcon,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Copy,
  Flag,
  Flame,
  Gift,
  LogOut,
  Mail,
  MessageCircle,
  Mic,
  Moon,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Target,
  Trash2,
  Trophy,
  Tv,
  UploadCloud,
  Users,
  Wifi,
  Smartphone,
  SmartphoneCharging,
  X,
  XCircle,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { getDoc } from "firebase/firestore";
import { auth, OFFER_MANAGER_UID } from "./firebase";
import {
  BRANDS,
  CLOSE_HINTS,
  CUSTOMER_TYPES,
  DICTIONARY,
  SERVICES,
  LOST_REASONS,
  WON_REASONS,
  addDays,
  dateText,
  formatPhone,
  heatTier,
  offerLineOnePrice,
  offerMatchesLead,
  relevantOffers,
  shortDateTime,
  todayStr,
  toDate,
  type Activity,
  type Brand,
  type CustomerType,
  type Lead,
  type LeadInput,
  type LeadStatus,
  type Offer,
  type OfferBrand,
  type OfferInput,
  type Service,
} from "./domain";
import {
  asLead,
  createLead,
  createOffer,
  deleteLead,
  deleteOffer,
  logActivity,
  saveMessage,
  updateLead,
  updateLeadStatus,
  updateOffer,
  upsertOffers,
  watchActivity,
  watchLeads,
  watchOffers,
} from "./data";
import { generateLeadMessage, scoreLeads, testAI } from "./ai";
import { readImportDraft, saveImportDraft, type ImportDraft } from './pdfDraft';
import { useDictation } from "./useDictation";
import "./style.css";

type Store = {
  user: User;
  leads: Lead[];
  offers: Offer[];
  loading: boolean;
  offersError: string;
  notify: (message: string, tone?: "success" | "error") => void;
  refreshScores: (ids?: string[]) => Promise<boolean>;
  scoring: boolean;
  scoreStatus: string;
};
const StoreContext = createContext<Store | null>(null);
function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store unavailable");
  return value;
}
function err(error: unknown) {
  const raw = error instanceof Error ? error.message : "Something went wrong.";
  if (raw.includes("permission-denied"))
    return "Firebase denied this action. The Firestore rules need to allow it.";
  if (raw.includes("auth/invalid-credential"))
    return "Email or password is incorrect.";
  if (raw.includes("auth/email-already-in-use"))
    return "An account with that email already exists.";
  if (raw.includes("auth/popup-closed-by-user"))
    return "Google sign-in was closed.";
  return raw;
}
function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <div className={`brandmark ${large ? "large" : ""}`}>
      <img
        src="/redleads-icon.svg"
        alt=""
        width={large ? 48 : 38}
        height={large ? 48 : 38}
      />
      <span>
        Red<span>Leads</span>
      </span>
    </div>
  );
}
function GradientButton({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`gradient-button ${className}`}
    >
      {children}
    </button>
  );
}
function Glass({
  children,
  className = "",
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`glass ${className}`} {...props}>
      {children}
    </div>
  );
}
function BrandBadge({ brand }: { brand: Brand | OfferBrand }) {
  return brand === "both" ? (
    <span className="brand-badge both">Both brands</span>
  ) : (
    <span className={`brand-badge ${brand}`}>
      {BRANDS.find((b) => b.id === brand)?.label || brand}
    </span>
  );
}
function HeatRing({
  score,
  size = 56,
}: {
  score: number | null;
  size?: number;
}) {
  const tier = heatTier(score);
  const radius = size * 0.39;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={`heat-ring ${tier}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={size > 70 ? 7 : 5}
          className="heat-track"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={size > 70 ? 7 : 5}
          className="heat-arc"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference * (1 - (score || 0) / 100),
          }}
          transition={{ duration: 1.1 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <strong>{score == null ? "…" : score}</strong>
    </div>
  );
}
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Map: Record<string, typeof Wifi> = {
    Wifi,
    SmartphoneCharging,
    Smartphone,
    Users,
    Tv,
    Gift,
  };
  const C = Map[name] || Sparkles;
  return <C size={size} />;
}
function HighlightedText({
  text,
  keywords,
}: {
  text: string;
  keywords: string[];
}) {
  if (!text) return <>No voice note yet.</>;
  const escaped = keywords
    .filter(Boolean)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(
    new RegExp(`(${[...escaped, DICTIONARY.source].join("|")})`, "gi"),
  );
  return (
    <>
      {parts.map((part, i) => {
        const match =
          keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ||
          new RegExp(`^(?:${DICTIONARY.source})$`, "i").test(part);
        return match ? <mark key={i}>{part}</mark> : part;
      })}
    </>
  );
}
function AppBackground() {
  return (
    <div className="app-background" aria-hidden="true">
      <motion.div
        className="orb orb-blue"
        animate={{ x: [0, 60, -25, 0], y: [0, 35, -25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb orb-violet"
        animate={{ x: [0, -65, 30, 0], y: [0, -35, 50, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="orb orb-pink"
        animate={{ x: [0, 40, -25, 0], y: [0, -35, 20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
function ThemeButton() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("redleads-theme") !== "light",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("redleads-theme", dark ? "dark" : "light");
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#172448" : "#e8f0ff");
  }, [dark]);
  return (
    <button
      className="icon-glass"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "Use light theme" : "Use dark theme"}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppBackground />
      <div className="shell">{children}</div>
    </>
  );
}
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Shell>
      <div className="auth-layout">
        <BrandMark large />
        <Glass className="auth-box">{children}</Glass>
        <p className="auth-fine">
          Built for Bell and Virgin Plus retail teams.
        </p>
      </div>
    </Shell>
  );
}
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate("/");
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="eyebrow">WELCOME BACK</div>
      <h1>
        Keep your <span className="text-gradient">momentum.</span>
      </h1>
      <p>Sign in to see who needs your attention today.</p>
      <form onSubmit={submit}>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <GradientButton type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"} <ArrowRight size={18} />
        </GradientButton>
      </form>
      <div className="auth-links">
        <Link to="/forgot-password">Forgot password?</Link>
        <span>
          New here? <Link to="/register">Create account</Link>
        </span>
      </div>
    </AuthLayout>
  );
}
function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await updateProfile(credential.user, { displayName: name.trim() });
      try {
        await sendEmailVerification(credential.user);
      } catch {}
      navigate("/welcome");
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="eyebrow">GET STARTED</div>
      <h1>
        Your next win <span className="text-gradient">starts here.</span>
      </h1>
      <p>Create your RedLeads account.</p>
      <form onSubmit={submit}>
        <label>
          Full name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <GradientButton type="submit" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}{" "}
          <ArrowRight size={18} />
        </GradientButton>
      </form>
      <div className="auth-links">
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </AuthLayout>
  );
}
function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <div className="eyebrow">ACCOUNT RECOVERY</div>
      <h1>
        Reset your <span className="text-gradient">password.</span>
      </h1>
      <p>Firebase will email you a secure reset link.</p>
      {sent ? (
        <Glass className="inner-note">
          Check your inbox for a password reset link.
        </Glass>
      ) : (
        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <GradientButton type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </GradientButton>
        </form>
      )}
      <div className="auth-links">
        <Link to="/login">Back to sign in</Link>
      </div>
    </AuthLayout>
  );
}
const slides = [
  {
    eyebrow: "YOUR LEADS, IN MOTION",
    title: "Meet RedLeads.",
    highlight: "RedLeads.",
    description:
      "A smarter workspace for every conversation, offer, and follow-up.",
    icon: Flame,
  },
  {
    eyebrow: "VOICE FIRST",
    title: "Log a lead in 20 seconds.",
    highlight: "20 seconds.",
    description:
      "Speak the story. We keep the details ready when it is time to follow up.",
    icon: Mic,
  },
  {
    eyebrow: "LIVE HEAT",
    title: "Cold leads can come back to life.",
    highlight: "come back to life.",
    description:
      "Scores adapt when a new offer matches what your customer asked for.",
    icon: Flame,
  },
  {
    eyebrow: "YOUR NEXT MOVE",
    title: "Know who to call, and what to say.",
    highlight: "what to say.",
    description:
      "Follow-up nudges and AI message drafts make the next step easier.",
    icon: MessageCircle,
  },
  {
    eyebrow: "SEE THE PROGRESS",
    title: "Prove your performance.",
    highlight: "performance.",
    description: "Track your wins, service mix, and the reasons deals close.",
    icon: Trophy,
  },
];
function Welcome() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  function finish() {
    localStorage.setItem("redleads-welcome-done", "1");
    navigate("/");
  }
  const slide = slides[step];
  const SlideIcon = slide.icon;
  return (
    <Shell>
      <div className="welcome">
        <div className="welcome-top">
          <BrandMark />
          <button onClick={finish}>Skip</button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="welcome-content"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <div className="welcome-illustration">
              <div className="welcome-orb">
                <SlideIcon size={52} />
              </div>
              {step === 0 && (
                <svg viewBox="0 0 300 50">
                  <path
                    d="M0 25 H80 l10-18 14 36 10-18 H300"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="4"
                  />
                </svg>
              )}
              {step === 1 && (
                <Glass>
                  “Looking for a cheaper phone plan with more data.”
                </Glass>
              )}
              {step === 2 && (
                <Glass>
                  <HeatRing score={22} size={45} /> New offer{" "}
                  <ArrowRight size={17} /> <HeatRing score={87} size={45} />
                </Glass>
              )}
              {step === 3 && (
                <Glass>“Hey Maria, want me to send over the details?”</Glass>
              )}
              {step === 4 && <Glass>34% win rate · 62 avg heat</Glass>}
            </div>
            <div className="eyebrow">{slide.eyebrow}</div>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
          </motion.div>
        </AnimatePresence>
        <div className="welcome-bottom">
          <div className="dots">
            {slides.map((_, i) => (
              <button
                key={i}
                className={i === step ? "active" : ""}
                onClick={() => setStep(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <GradientButton
            onClick={() =>
              step === slides.length - 1 ? finish() : setStep(step + 1)
            }
          >
            {step === slides.length - 1 ? "Start logging leads" : "Next"}{" "}
            <ArrowRight size={18} />
          </GradientButton>
        </div>
      </div>
    </Shell>
  );
}
function Protected({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined)
    return (
      <Shell>
        <div className="loading-screen">
          <BrandMark />
          <span>Loading your workspace…</span>
        </div>
      </Shell>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <Workspace user={user}>{children}</Workspace>;
}
function Workspace({ user, children }: { user: User; children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [leadsReady, setLeadsReady] = useState(false);
  const [offersReady, setOffersReady] = useState(false);
  const [offersError, setOffersError] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreStatus, setScoreStatus] = useState("");
  const scoredOnMount = useRef(false);
  const previousOffers = useRef<string | null>(null);
  useEffect(() => {
    setLeadsReady(false);
    return watchLeads(
      user.uid,
      (items) => {
        setLeads(items);
        setLeadsReady(true);
      },
      (error) => {
        setLeadsReady(true);
        notify(err(error), "error");
      },
    );
  }, [user.uid]);
  useEffect(() => {
    setOffersReady(false);
    return watchOffers(
      (items) => {
        setOffers(items);
        setOffersReady(true);
        setOffersError("");
      },
      (error) => {
        setOffersReady(true);
        setOffersError(err(error));
      },
    );
  }, [user.uid]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function notify(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
  }
  async function refreshScores(ids?: string[]) {
    if (scoring) return false;
    const items = leads.filter(
      (l) => l.status === "active" && (!ids || ids.includes(l.id)),
    );
    if (!items.length) return false;
    setScoring(true);
    setScoreStatus("Matching leads to offers…");
    try {
      const count = await scoreLeads(items, offers, (done, total) =>
        setScoreStatus(`Scored ${done} of ${total} leads…`),
      );
      setScoreStatus(`${count} heat score${count === 1 ? "" : "s"} updated`);
      if (count) notify(`${count} heat score${count === 1 ? "" : "s"} updated`);
      return count > 0;
    } catch (error) {
      setScoreStatus("Scoring failed");
      notify(err(error), "error");
      return false;
    } finally {
      setScoring(false);
    }
  }
  useEffect(() => {
    if (!leadsReady || !offersReady || scoredOnMount.current) return;
    scoredOnMount.current = true;
    const stale = leads
      .filter((l) => l.status === "active" && l.scored_date !== todayStr())
      .slice(0, 40);
    if (stale.length) void refreshScores(stale.map((l) => l.id));
  }, [leadsReady, offersReady]);
  useEffect(() => {
    if (!offersReady || !leadsReady) return;
    const key = offers
      .map((o) => `${o.id}:${toDate(o.updatedAt)?.getTime() || ""}`)
      .join("|");
    if (
      previousOffers.current !== null &&
      previousOffers.current !== key &&
      leads.length
    )
      void refreshScores();
    previousOffers.current = key;
  }, [offers, offersReady, leadsReady]);
  const value = {
    user,
    leads,
    offers,
    loading: !leadsReady,
    offersError,
    notify,
    refreshScores,
    scoring,
    scoreStatus,
  };
  return (
    <StoreContext.Provider value={value}>
      <Shell>{children}</Shell>
      {toast && (
        <div className={`toast ${toast.tone}`} role="status">
          {toast.tone === "error" ? <XCircle size={18} /> : <Check size={18} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}
function TopBar() {
  return (
    <header className="topbar">
      <Link to="/" className="topbrand">
        <img
          className="topbrand-tile"
          src="/redleads-icon.svg"
          alt=""
          width="38"
          height="38"
        />
        RedLeads
      </Link>
      <div className="top-actions">
        <Link to="/offers" className="glass-pill">
          Offers
        </Link>
        <Link to="/account" className="icon-glass" aria-label="Account">
          <CircleUserRound size={19} />
        </Link>
        <ThemeButton />
      </div>
    </header>
  );
}
function Home() {
  const { leads, offers, loading, refreshScores, scoring } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"active" | "analytics">("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState<"all" | Brand>("all");
  const [service, setService] = useState<"all" | Service>("all");
  const [tier, setTier] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [sort, setSort] = useState<"heat" | "recent" | "followup">("heat");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const due = leads
    .filter(
      (l) =>
        l.status === "active" &&
        l.follow_up_date &&
        l.follow_up_date <= todayStr(),
    )
    .sort((a, b) => (b.heat_score || 0) - (a.heat_score || 0));
  const active = leads.filter((l) => l.status === "active");
  const hot = active.filter((l) => heatTier(l.heat_score) === "hot").length;
  const warm = active.filter((l) => heatTier(l.heat_score) === "warm").length;
  const cold = active.filter((l) => heatTier(l.heat_score) === "cold").length;
  useEffect(() => {
    if (
      !loading &&
      !leads.length &&
      !localStorage.getItem("redleads-welcome-done")
    )
      navigate("/welcome");
  }, [loading, leads.length]);
  const visible = useMemo(
    () =>
      active
        .filter(
          (l) =>
            (!q ||
              `${l.customer_name} ${l.transcript} ${l.heat_reason}`
                .toLowerCase()
                .includes(q.toLowerCase())) &&
            (brand === "all" || l.brand === brand) &&
            (service === "all" || l.services.includes(service)) &&
            (tier === "all" || heatTier(l.heat_score) === tier),
        )
        .sort((a, b) =>
          sort === "heat"
            ? (b.heat_score ?? -1) - (a.heat_score ?? -1)
            : sort === "followup"
              ? (a.follow_up_date || "9999").localeCompare(
                  b.follow_up_date || "9999",
                )
              : (toDate(b.createdAt)?.getTime() || 0) -
                (toDate(a.createdAt)?.getTime() || 0),
        ),
    [active, q, brand, service, tier, sort],
  );
  const selected = leads.find((l) => l.id === openId) || null;
  return (
    <>
      <TopBar />
      <main className="page home">
        <div className="summary">
          <div className="eyebrow">{format(new Date(), "EEEE, MMMM d")}</div>
          <div className="summary-row">
            <h1>
              <span className="text-gradient">{hot} hot</span>{" "}
              {hot === 1 ? "lead" : "leads"} ready today.
            </h1>
            <button
              className="glass-pill rescore"
              onClick={() => void refreshScores()}
              disabled={scoring}
            >
              <RefreshCw size={16} className={scoring ? "spin" : ""} />
              <span>{scoring ? "Scoring" : "Rescore"}</span>
            </button>
          </div>
          <p>
            {warm} warm · {cold} cold · {active.length} active leads
          </p>
        </div>
        {!!due.length && tab === "active" && (
          <Glass className="todays-calls">
            <div className="section-title">
              <div>
                <CalendarClock size={20} />
                <h2>Today's calls</h2>
              </div>
              <span className="gradient-badge">{due.length} due</span>
            </div>
            {due.slice(0, 5).map((lead) => (
              <div className="call-row" key={lead.id}>
                <button
                  className="call-open"
                  onClick={() => setOpenId(lead.id)}
                >
                  <HeatRing score={lead.heat_score} size={40} />
                  <span>
                    <strong>{lead.customer_name}</strong>
                    <small
                      className={
                        lead.follow_up_date < todayStr() ? "overdue" : ""
                      }
                    >
                      {lead.follow_up_date < todayStr()
                        ? `Overdue — was ${dateText(lead.follow_up_date)}`
                        : "Due today"}
                    </small>
                  </span>
                </button>
                <a
                  href={`tel:${lead.phone}`}
                  className="small-call"
                  aria-label={`Call ${lead.customer_name}`}
                >
                  <Phone size={17} />
                </a>
              </div>
            ))}
            <p className="hint">
              Tap a lead for the full story <ArrowRight size={13} />
            </p>
          </Glass>
        )}
        <Glass className="segment-tabs">
          <button
            className={tab === "active" ? "selected" : ""}
            onClick={() => setTab("active")}
          >
            Active leads
          </button>
          <button
            className={tab === "analytics" ? "selected" : ""}
            onClick={() => setTab("analytics")}
          >
            Analytics
          </button>
        </Glass>
        {tab === "active" ? (
          <>
            <div className="list-head">
              <h2>
                Your pipeline <span>{active.length}</span>
              </h2>
              {active.length > 2 && (
                <span>
                  Sorted by{" "}
                  {sort === "heat"
                    ? "heat"
                    : sort === "recent"
                      ? "recent activity"
                      : "follow-up"}
                </span>
              )}
            </div>
            {active.length > 2 && (
              <Glass className="search-toolbar">
                <Search size={18} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search leads"
                  aria-label="Search leads"
                />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  aria-label="Sort leads"
                >
                  <option value="heat">Heat</option>
                  <option value="recent">Recent</option>
                  <option value="followup">Follow-up</option>
                </select>
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal size={18} />
                  {(brand !== "all" || service !== "all" || tier !== "all") && (
                    <i />
                  )}
                </button>
              </Glass>
            )}
            {filtersOpen && (
              <Glass className="filter-panel">
                <div className="filter-chips">
                  {(["all", "bell", "virgin"] as const).map((v) => (
                    <button
                      key={v}
                      className={brand === v ? "active" : ""}
                      onClick={() => setBrand(v)}
                    >
                      {v === "all"
                        ? "All brands"
                        : v === "bell"
                          ? "Bell"
                          : "Virgin Plus"}
                    </button>
                  ))}
                </div>
                <div className="filter-chips">
                  {(
                    ["all", ...SERVICES.map((s) => s.id)] as Array<
                      "all" | Service
                    >
                  ).map((v) => (
                    <button
                      key={v}
                      className={service === v ? "active" : ""}
                      onClick={() => setService(v)}
                    >
                      {v === "all"
                        ? "All services"
                        : SERVICES.find((s) => s.id === v)?.label}
                    </button>
                  ))}
                </div>
                <div className="filter-chips">
                  {(["all", "hot", "warm", "cold"] as const).map((v) => (
                    <button
                      key={v}
                      className={tier === v ? "active" : ""}
                      onClick={() => setTier(v)}
                    >
                      {v === "all" ? "Any heat" : v}
                    </button>
                  ))}
                </div>
                <button
                  className="clear-filters"
                  onClick={() => {
                    setBrand("all");
                    setService("all");
                    setTier("all");
                    setQ("");
                  }}
                >
                  Clear filters
                </button>
              </Glass>
            )}
            {loading ? (
              <Glass className="empty-state">Loading your leads…</Glass>
            ) : visible.length ? (
              <div className="lead-list">
                {visible.slice(0, 50).map((lead, i) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 12) * 0.04 }}
                  >
                    <LeadCard lead={lead} onOpen={() => setOpenId(lead.id)} />
                  </motion.div>
                ))}
                {visible.length > 50 && (
                  <p className="hint centered">
                    Showing 50 of {visible.length} — refine the filters to see
                    more.
                  </p>
                )}
              </div>
            ) : (
              <Glass className="empty-state">
                <div className="empty-tile">
                  <Sparkles size={27} />
                </div>
                <h3>
                  {active.length
                    ? "Nothing matches those filters"
                    : "Your next win starts here."}
                </h3>
                <p>
                  {active.length
                    ? "Try clearing a filter or search."
                    : "Log your first lead and let RedLeads help with the follow-up."}
                </p>
                {!active.length && (
                  <Link className="gradient-button" to="/log">
                    Log a lead <ArrowRight size={17} />
                  </Link>
                )}
              </Glass>
            )}
          </>
        ) : (
          <AnalyticsTab leads={leads} />
        )}
        <Link to="/log" className="log-lead-cta">
          <span>
            <Mic size={22} />
          </span>
          Log lead <ArrowRight size={19} />
        </Link>
      </main>
      {selected && (
        <LeadSheet
          lead={selected}
          offers={offers}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const [messageOpen, setMessageOpen] = useState(false);
  return (
    <>
      <Glass className="lead-card">
        <button className="lead-card-main" onClick={onOpen}>
          <HeatRing score={lead.heat_score} />
          <div className="lead-card-copy">
            <div className="lead-name-line">
              <strong>{lead.customer_name}</strong>
              <BrandBadge brand={lead.brand} />
            </div>
            <p>{lead.heat_reason || "Matching against today's offers…"}</p>
            <div className="lead-meta">
              {lead.services.slice(0, 3).map((s) => (
                <span key={s} title={SERVICES.find((x) => x.id === s)?.label}>
                  <Icon
                    name={SERVICES.find((x) => x.id === s)?.icon || "Sparkles"}
                    size={13}
                  />
                </span>
              ))}
              {lead.services.includes("multiline") && <b>High-value</b>}
              {lead.follow_up_date && (
                <small
                  className={lead.follow_up_date <= todayStr() ? "due" : ""}
                >
                  <CalendarClock size={12} />
                  {lead.follow_up_date <= todayStr()
                    ? "Follow up today"
                    : dateText(lead.follow_up_date)}
                </small>
              )}
            </div>
          </div>
        </button>
        <div className="lead-actions-mini">
          <button
            onClick={() => setMessageOpen(true)}
            aria-label={`Draft a message for ${lead.customer_name}`}
          >
            <MessageCircle size={18} /> <span>Message</span>
          </button>
          <a
            href={`tel:${lead.phone}`}
            aria-label={`Call ${lead.customer_name}`}
          >
            <Phone size={18} /> <span>Call</span>
          </a>
        </div>
      </Glass>
      {messageOpen && (
        <MessageDialog lead={lead} onClose={() => setMessageOpen(false)} />
      )}
    </>
  );
}
function AnalyticsTab({ leads }: { leads: Lead[] }) {
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const active = leads.filter((l) => l.status === "active");
  const conversion =
    won.length + lost.length
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;
  const average = active.length
    ? Math.round(
        active.reduce((n, l) => n + (l.heat_score || 0), 0) / active.length,
      )
    : 0;
  const chart = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i);
    return {
      date: format(day, "MMM d"),
      count: leads.filter(
        (l) =>
          toDate(l.createdAt) &&
          format(toDate(l.createdAt)!, "yyyy-MM-dd") ===
            format(day, "yyyy-MM-dd"),
      ).length,
    };
  });
  const counts = SERVICES.map((s) => ({
    label: s.label,
    count: leads.filter((l) => l.services.includes(s.id)).length,
  })).sort((a, b) => b.count - a.count);
  const top = counts[0]?.count || 1;
  return (
    <div className="analytics">
      <div className="analytics-grid">
        <StatCard
          icon={<ClipboardList />}
          label="Leads logged"
          value={leads.length}
        />
        <StatCard icon={<Trophy />} label="Leads won" value={won.length} />
        <StatCard icon={<Target />} label="Win rate" value={`${conversion}%`} />
        <StatCard icon={<Flame />} label="Avg active heat" value={average} />
      </div>
      <Glass className="analytics-card">
        <h3>
          Leads logged <small>Last 14 days</small>
        </h3>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                interval={2}
                tick={{ fontSize: 10, fill: "var(--muted-text)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Glass>
      <Glass className="analytics-card">
        <h3>Service breakdown</h3>
        {counts.map((item) => (
          <div className="service-bar" key={item.label}>
            <span>{item.label}</span>
            <div>
              <i style={{ width: `${(item.count / top) * 100}%` }} />
            </div>
            <b>{item.count}</b>
          </div>
        ))}
      </Glass>
      {won.length + lost.length > 0 && (
        <Glass className="analytics-card">
          <h3>Why deals close</h3>
          <div className="reason-columns">
            <div>
              <h4>
                <Trophy size={16} /> Won
              </h4>
              {won.map((l) => (
                <p key={l.id}>{l.outcome_reason || "No reason recorded"}</p>
              ))}
            </div>
            <div>
              <h4>
                <XCircle size={16} /> Lost
              </h4>
              {lost.map((l) => (
                <p key={l.id}>{l.outcome_reason || "No reason recorded"}</p>
              ))}
            </div>
          </div>
        </Glass>
      )}
    </div>
  );
}
function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Glass className="stat-card">
      <span>{icon}</span>
      <strong className="text-gradient">{value}</strong>
      <small>{label}</small>
    </Glass>
  );
}
function MessageDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { offers, notify, user } = useStore();
  const [firstName, setFirstName] = useState(() => (user.displayName || user.providerData.find(p => p.displayName)?.displayName || "").trim().split(/\s+/)[0]);
  const [message, setMessage] = useState(lead.last_message || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generatedOnOpen = useRef(false);
  const requestId = useRef(0);
  const edited = useRef(false);
  useEffect(() => {
    if (generatedOnOpen.current) return;
    generatedOnOpen.current = true;
    void generate();
  }, []);
  async function generate() {
    const id = ++requestId.current;
    edited.current = false;
    setBusy(true);
    setError("");
    try {
      const draft = await generateLeadMessage(lead, offers, firstName);
      if (id === requestId.current && !edited.current) setMessage(draft);
    } catch (cause) {
      if (id === requestId.current) setError(err(cause));
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  async function save() {
    try {
      await saveMessage(lead, message);
      notify("Draft saved to this lead.");
    } catch (cause) {
      setError(err(cause));
    }
  }
  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <Glass
        className="message-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Draft follow-up message"
      >
        <div className="dialog-head">
          <div>
            <div className="eyebrow">FOLLOW UP</div>
            <h2>Message {lead.customer_name.split(" ")[0]}</h2>
          </div>
          <button className="icon-glass" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p>A draft for you to review. Nothing sends automatically.</p>
        <label className="sender-name">
          Your first name
          <input value={firstName} onChange={(e) => setFirstName(e.target.value.trimStart().split(/\s+/)[0])} placeholder="Set your name in Account" />
        </label>
        <textarea
          rows={6}
          value={message}
          onChange={(e) => { edited.current = true; setMessage(e.target.value); }}
          maxLength={320}
          placeholder={busy ? "Writing your draft…" : "Write your own message…"}
        />
        <span className="char-count">{message.length}/320</span>
        {error && <p className="form-error">{error}</p>}
        <GradientButton onClick={generate} disabled={busy}>
          <Sparkles size={18} />
          {busy ? "Writing…" : "Generate with AI"}
        </GradientButton>
        <div className="message-tools">
          <button disabled={!message} onClick={() => void save()}>
            <Check size={16} /> Save draft
          </button>
          <button
            disabled={!message}
            onClick={() => {
              void navigator.clipboard.writeText(message);
              notify("Copied to clipboard.");
            }}
          >
            <Copy size={16} /> Copy
          </button>
          <a
            className={!message ? "disabled" : ""}
            href={
              message
                ? `sms:${lead.phone}?body=${encodeURIComponent(message)}`
                : undefined
            }
            onClick={() =>
              void logActivity(lead, "message", "Opened SMS draft")
            }
          >
            <Send size={16} /> Open SMS
          </a>
        </div>
      </Glass>
    </div>
  );
}
function LeadSheet({
  lead,
  offers,
  onClose,
}: {
  lead: Lead;
  offers: Offer[];
  onClose: () => void;
}) {
  const { notify, refreshScores, scoring } = useStore();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [activityError, setActivityError] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const matchedOffers = (lead.matched_offers.length ? lead.matched_offers : [lead.matched_offer])
    .map(title => offers.find(offer => offer.title === title && offerMatchesLead(offer, lead) && relevantOffers([offer]).length && offerLineOnePrice(offer)))
    .filter((offer): offer is Offer => Boolean(offer))
    .slice(0, 2);
  useEffect(() => {
    setActivity([]);
    setActivityError("");
    return watchActivity(lead, setActivity, (error) =>
      setActivityError(err(error)),
    );
  }, [lead.id]);
  async function closeLead() {
    if (!closing) return;
    setBusy(true);
    try {
      await updateLeadStatus(lead, closing, reason);
      notify(`Lead marked ${closing}.`);
      onClose();
    } catch (cause) {
      notify(err(cause), "error");
    } finally {
      setBusy(false);
    }
  }
  async function reopen() {
    setBusy(true);
    try {
      await updateLeadStatus(lead, "active");
      notify("Lead reopened.");
      onClose();
    } catch (cause) {
      notify(err(cause), "error");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !window.confirm(
        `Delete ${lead.customer_name} and the activity history? This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteLead(lead);
      notify("Lead deleted.");
      onClose();
    } catch (cause) {
      notify(err(cause), "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="lead-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`${lead.customer_name} details`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div className="sheet-person">
            <HeatRing score={lead.heat_score} size={88} />
            <div>
              <h2>{lead.customer_name}</h2>
              <BrandBadge brand={lead.brand} />
              <p>
                {formatPhone(lead.phone)}
                {lead.email && <> · {lead.email}</>}
              </p>
            </div>
          </div>
          <button className="icon-glass" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="sheet-actions">
          <a
            className="action-pill"
            href={`tel:${lead.phone}`}
            onClick={() =>
              void logActivity(lead, "call", "Opened phone dialer")
            }
          >
            <Phone size={17} /> Call now
          </a>
          <button
            className="action-pill"
            onClick={() => setMessageOpen(true)}
          >
            <MessageCircle size={17} /> Message
          </button>
          <button
            className="action-pill"
            onClick={() => {
              onClose();
              navigate(`/leads/${lead.id}/edit`);
            }}
          >
            <Pencil size={16} /> Edit
          </button>
          <button
            className="action-pill"
            disabled={scoring}
            onClick={() => {
              void refreshScores([lead.id]).then((ok) => {
                if (ok)
                  void logActivity(lead, "rescore", "Heat score refreshed");
              });
            }}
          >
            <Flame size={16} /> Re-score
          </button>
        </div>
        <div className="sheet-scroll">
          <Glass className="insight-card">
            <div className="eyebrow">
              <Sparkles size={14} /> HEAT INSIGHT
            </div>
            <p>{lead.heat_reason || "Matching against today's offers…"}</p>
            {matchedOffers.length > 0 && (
              <div className="insight-offers">
                <small>{matchedOffers.length === 1 ? "Matching offer" : "Matching offers"} · Line 1 with AutoPay</small>
                {matchedOffers.map(offer => (
                  <div className="insight-offer" key={offer.id}>
                    <strong>{offer.title}</strong>
                    <b>{offerLineOnePrice(offer)}</b>
                  </div>
                ))}
              </div>
            )}
          </Glass>
          {lead.close_requirements && (
            <Glass className="detail-card">
              <h3>
                <Target size={18} /> To close
              </h3>
              <p>{lead.close_requirements}</p>
            </Glass>
          )}
          <Glass className="detail-card">
            <h3>Interested in</h3>
            <div className="chip-row">
              {lead.services.map((s) => (
                <span className="chip simple" key={s}>
                  {SERVICES.find((x) => x.id === s)?.label || s}
                </span>
              ))}
              {!lead.services.length && (
                <span className="subtle">Not specified</span>
              )}
            </div>
          </Glass>
          <Glass className="detail-card">
            <h3>
              <Mic size={17} /> Voice note
            </h3>
            <p className="transcript">
              <HighlightedText
                text={lead.transcript}
                keywords={lead.keywords}
              />
            </p>
          </Glass>
          {lead.status !== "active" && (
            <Glass className="detail-card">
              <h3>
                {lead.status === "won" ? "Why it closed" : "Why it was lost"}
              </h3>
              <p>{lead.outcome_reason || "No reason recorded"}</p>
            </Glass>
          )}
          <Glass className="detail-card">
            <h3>
              <CalendarClock size={17} /> Follow-up
            </h3>
            <p>
              {dateText(lead.follow_up_date, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </Glass>
          <Glass className="detail-card">
            <h3>
              <ActivityIcon size={17} /> Activity
            </h3>
            {activityError ? (
              <p className="form-error">{activityError}</p>
            ) : activity.length ? (
              activity.map((item) => (
                <div className="activity-row" key={item.id}>
                  <span>
                    {item.type === "call" ? (
                      <Phone size={15} />
                    ) : item.type === "message" ? (
                      <MessageCircle size={15} />
                    ) : item.type === "status" ? (
                      <Flag size={15} />
                    ) : (
                      <Flame size={15} />
                    )}
                  </span>
                  <div>
                    <p>{item.note}</p>
                    <small>{shortDateTime(item.createdAt)}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="subtle">Nothing logged yet…</p>
            )}
          </Glass>
          {lead.status === "active" ? (
            <Glass className="close-card">
              {closing ? (
                <>
                  <h3>
                    {closing === "won"
                      ? "What sealed the win?"
                      : "Why was it lost?"}
                  </h3>
                  <p>This helps your analytics.</p>
                  <div className="chip-row">
                    {(closing === "won" ? WON_REASONS : LOST_REASONS).map(
                      (item) => (
                        <button
                          key={item}
                          className={`chip ${reason === item ? "selected" : ""}`}
                          onClick={() => setReason(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Add a reason…"
                  />
                  <div className="split-actions">
                    <button
                      className="action-pill"
                      onClick={() => {
                        setClosing(null);
                        setReason("");
                      }}
                    >
                      Back
                    </button>
                    <GradientButton
                      onClick={() => void closeLead()}
                      disabled={busy}
                    >
                      Confirm {closing}
                    </GradientButton>
                  </div>
                </>
              ) : (
                <div className="split-actions">
                  <button
                    className="action-pill won"
                    onClick={() => setClosing("won")}
                  >
                    <Trophy size={17} /> Mark won
                  </button>
                  <button
                    className="action-pill lost"
                    onClick={() => setClosing("lost")}
                  >
                    <XCircle size={17} /> Mark lost
                  </button>
                </div>
              )}
            </Glass>
          ) : (
            <div className="closed-actions">
              <GradientButton onClick={() => void reopen()} disabled={busy}>
                Reopen lead
              </GradientButton>
              <button
                className="danger-button"
                onClick={() => void remove()}
                disabled={busy}
              >
                <Trash2 size={16} /> Delete lead
              </button>
            </div>
          )}
        </div>
      </motion.div>
      {messageOpen && (
        <MessageDialog lead={lead} onClose={() => setMessageOpen(false)} />
      )}
    </div>
  );
}
const emptyLead = (): LeadInput => ({
  customer_name: "",
  phone: "",
  email: "",
  brand: "bell",
  services: [],
  customer_type: [],
  transcript: "",
  follow_up_date: addDays(3),
});
const wizardSteps = [
  { title: "Who did you talk to?", sub: "Start with the essentials." },
  {
    title: "What are they shopping for?",
    sub: "These details help match the right offers.",
  },
  {
    title: "Tell the story.",
    sub: "Speak naturally. We will hold on to the important details.",
  },
  {
    title: "When to follow up?",
    sub: "A timely check-in makes all the difference.",
  },
];
function LeadWizard({ edit = false }: { edit?: boolean }) {
  const { leads, offers, notify, loading } = useStore();
  const { id } = useParams();
  const navigate = useNavigate();
  const existing = edit ? leads.find((l) => l.id === id) : undefined;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<LeadInput>(emptyLead);
  const [busy, setBusy] = useState(false);
  const [savingPhase, setSavingPhase] = useState<"saving" | "scoring">("saving");
  const [voiceEdit, setVoiceEdit] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (existing)
      setForm({
        customer_name: existing.customer_name,
        phone: existing.phone,
        email: existing.email,
        brand: existing.brand,
        services: existing.services,
        customer_type: existing.customer_type,
        transcript: existing.transcript,
        follow_up_date: existing.follow_up_date,
      });
  }, [existing?.id]);
  const dictation = useDictation((text) =>
    setForm((current) => ({
      ...current,
      transcript: `${current.transcript} ${text}`.trim(),
    })),
  );
  const canNext =
    step === 0
      ? !!form.customer_name.trim() && !!form.phone.trim()
      : step === 1
        ? !!form.brand && form.services.length > 0
        : true;
  function toggleService(id: Service) {
    setForm((current) => ({
      ...current,
      services: current.services.includes(id)
        ? current.services.filter((x) => x !== id)
        : [...current.services, id],
    }));
  }
  function toggleType(id: CustomerType) {
    setForm((current) => ({
      ...current,
      customer_type: current.customer_type.includes(id)
        ? current.customer_type.filter((x) => x !== id)
        : [...current.customer_type, id],
    }));
  }
  async function save() {
    setBusy(true);
    setSavingPhase("saving");
    setError("");
    try {
      let savedLead: Lead;
      if (edit && existing) {
        await updateLead(existing, form);
        savedLead = { ...existing, ...form, scored_date: "" };
      } else {
        const ref = await createLead(form);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Saved lead could not be loaded for scoring.");
        savedLead = asLead(snap.id, snap.data());
      }
      setSavingPhase("scoring");
      try {
        const scored = await scoreLeads([savedLead], offers);
        if (scored !== 1) throw new Error("AI did not return a score for this lead.");
        notify(edit ? "Lead updated and re-scored." : "Lead logged and scored.");
      } catch (cause) {
        notify(`Lead saved, but scoring failed: ${err(cause)}`, "error");
      }
      navigate("/");
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  }
  if (edit && !existing)
    return (
      <main className="page">
        <TopBar />
        <Glass className="empty-state">
          {loading ? "Loading lead…" : "Lead not found."}
        </Glass>
      </main>
    );
  const question = wizardSteps[step];
  return (
    <>
      <TopBar />
      <main className="page wizard">
        <div className="wizard-header">
          <button
            className="icon-glass"
            onClick={() => (step ? setStep(step - 1) : navigate("/"))}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="step-bars">
            {wizardSteps.map((_, i) => (
              <span key={i} className={i <= step ? "filled" : ""} />
            ))}
          </div>
          <div className="eyebrow">
            STEP {step + 1} OF 4 {edit ? "· EDIT LEAD" : ""}
          </div>
          <h1>{question.title}</h1>
          <p>{question.sub}</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="wizard-content"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            {step === 0 && (
              <div className="form-stack">
                <label>
                  Customer name <b>*</b>
                  <input
                    autoFocus
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm({ ...form, customer_name: e.target.value })
                    }
                    placeholder="e.g. Sarah Mitchell"
                  />
                </label>
                <label>
                  Phone number <b>*</b>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="(555) 000-0000"
                  />
                </label>
                <label>
                  Email <span>Optional</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="sarah@example.com"
                  />
                </label>
              </div>
            )}
            {step === 1 && (
              <>
                <h3>Choose a brand</h3>
                <div className="brand-tiles">
                  {BRANDS.map((b) => (
                    <button
                      key={b.id}
                      className={`brand-tile ${b.id} ${form.brand === b.id ? "selected" : ""}`}
                      onClick={() => setForm({ ...form, brand: b.id })}
                    >
                      {b.label}
                      {form.brand === b.id && <Check size={19} />}
                    </button>
                  ))}
                </div>
                <h3>Interested in</h3>
                <div className="service-grid">
                  {SERVICES.map((s) => (
                    <button
                      key={s.id}
                      className={`service-tile ${form.services.includes(s.id) ? "selected" : ""}`}
                      onClick={() => toggleService(s.id)}
                    >
                      <span>
                        <Icon name={s.icon} size={23} />
                      </span>
                      <strong>{s.label}</strong>
                      {s.highValue && <small>High-value lead</small>}
                      {form.services.includes(s.id) && (
                        <Check className="selected-check" size={17} />
                      )}
                    </button>
                  ))}
                </div>
                <h3>Customer type</h3>
                <p className="field-help">
                  Select everything they qualify for.
                </p>
                <div className="chip-row">
                  {CUSTOMER_TYPES.map((t) => (
                    <button
                      key={t.id}
                      className={`chip ${form.customer_type.includes(t.id) ? "selected" : ""}`}
                      onClick={() => toggleType(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="voice-center">
                  <button
                    className={`mic-button ${dictation.listening ? "listening" : ""}`}
                    onClick={dictation.start}
                    aria-label={
                      dictation.listening ? "Stop dictation" : "Start dictation"
                    }
                  >
                    {dictation.listening ? (
                      <Square size={32} fill="currentColor" />
                    ) : (
                      <Mic size={42} />
                    )}
                  </button>
                  <p>
                    {dictation.error ||
                      (!dictation.supported
                        ? "Dictation is unavailable here. Type below."
                        : dictation.listening
                          ? "Listening… tap to stop"
                          : "Tap to dictate")}
                  </p>
                </div>
                <Glass className="transcript-box">
                  <div className="section-title">
                    <h3>Voice note</h3>
                    <button onClick={() => setVoiceEdit(!voiceEdit)}>
                      {voiceEdit ? <Check size={17} /> : <Pencil size={17} />}
                    </button>
                  </div>
                  {voiceEdit ? (
                    <textarea
                      rows={6}
                      value={form.transcript}
                      onChange={(e) =>
                        setForm({ ...form, transcript: e.target.value })
                      }
                      placeholder="What did they say? What would close the deal?"
                    />
                  ) : (
                    <p>
                      <HighlightedText text={form.transcript} keywords={[]} />
                      {dictation.interim && (
                        <span className="interim"> {dictation.interim}</span>
                      )}
                    </p>
                  )}
                </Glass>
                <h3>What would close the deal?</h3>
                <div className="chip-row">
                  {CLOSE_HINTS.map((hint) => (
                    <button
                      key={hint}
                      className="chip"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          transcript:
                            `${current.transcript.trim()} ${hint}.`.trim(),
                        }))
                      }
                    >
                      + {hint}
                    </button>
                  ))}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h3>Quick pick</h3>
                <div className="chip-row">
                  {[1, 3, 7, 14].map((days) => (
                    <button
                      key={days}
                      className={`chip ${form.follow_up_date === addDays(days) ? "selected" : ""}`}
                      onClick={() =>
                        setForm({ ...form, follow_up_date: addDays(days) })
                      }
                    >
                      {days === 1
                        ? "Tomorrow"
                        : days === 3
                          ? "In 3 days"
                          : days === 7
                            ? "In 1 week"
                            : "In 2 weeks"}
                    </button>
                  ))}
                </div>
                <Glass className="reminder-card">
                  <CalendarClock size={23} />
                  <span>Reminder set for</span>
                  <strong className="text-gradient">
                    {dateText(form.follow_up_date, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                  <input
                    type="date"
                    min={todayStr()}
                    value={form.follow_up_date}
                    onChange={(e) =>
                      setForm({ ...form, follow_up_date: e.target.value })
                    }
                    aria-label="Follow-up date"
                  />
                </Glass>
              </>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="wizard-footer">
          <GradientButton
            disabled={!canNext || busy}
            onClick={() => (step < 3 ? setStep(step + 1) : void save())}
          >
            {busy
              ? savingPhase === "scoring" ? "Re-scoring…" : "Saving…"
              : step < 3
                ? step === 2 && !form.transcript
                  ? "Skip for now"
                  : "Continue"
                : edit
                  ? "Save changes"
                  : "Save lead"}{" "}
            <ArrowRight size={18} />
          </GradientButton>
        </div>
      </main>
    </>
  );
}
const emptyOffer = (): OfferInput => ({
  title: "",
  description: "",
  brand: "both",
  services: [],
  customer_segments: [],
  valid_until: "",
});
function OffersPage() {
  const { user, offers, offersError, notify, scoreStatus, scoring } = useStore();
  const canManageOffers = user.uid === OFFER_MANAGER_UID;
  const navigate = useNavigate();
  const [form, setForm] = useState<OfferInput>(emptyOffer);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<OfferInput[] | null>(() => {const draft=readImportDraft();return draft && draft.nextPage===draft.pageCount ? draft.offers : null;});
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(() => readImportDraft());
  const [error, setError] = useState("");
  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editingOffer) await updateOffer(editingOffer, form);
      else await createOffer(form);
      setForm(emptyOffer());
      setEditingOffer(null);
      notify(`Offer ${editingOffer ? 'updated' : 'added'}. Active leads will be re-scored.`);
    } catch (cause) {
      setError(err(cause));
    } finally {
      setBusy(false);
    }
  }
  function startEditing(offer: Offer) {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = offer;
    setForm(input);
    setEditingOffer(offer);
    document.querySelector('.offer-form')?.scrollIntoView({behavior:'smooth'});
  }
  async function remove(offer: Offer) {
    if (!window.confirm(`Delete the offer "${offer.title}"?`)) return;
    try {
      await deleteOffer(offer);
      notify("Offer removed. Active leads will be re-scored.");
    } catch (cause) {
      notify(err(cause), "error");
    }
  }
  async function chooseFile(file?: File) {
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const { extractOffersFromPdf } = await import('./pdfImport');
      const result = await extractOffersFromPdf(file, setImportDraft);
      if (!result.offers.length)
        throw new Error("No supported offers were found in this PDF.");
      setPreview(result.offers);
    } catch (cause) {
      setError(err(cause));
    } finally {
      setImporting(false);
    }
  }
  async function commitImport() {
    if (!preview) return;
    setImporting(true);
    setError("");
    try {
      const result = await upsertOffers(preview, offers);
      setPreview(null);
      setImportDraft(null);
      saveImportDraft(null);
      notify(
        `${result.created} offers added, ${result.updated} updated, ${result.retired} older offers retired. Leads will be re-scored.`,
      );
    } catch (cause) {
      setError(err(cause));
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <TopBar />
      <main className="page offers-page">
        <button className="back-link" onClick={() => navigate("/")}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="eyebrow">LIVE OFFER LIBRARY</div>
        <h1>
          Today's <span className="text-gradient">offers.</span>
        </h1>
        <p className="page-sub">
          Every change refreshes heat scores for active users.
        </p>
        {scoreStatus && (
          <p className="inline-status">
            <Sparkles size={16} />
            {scoring ? "Re-scoring your leads…" : scoreStatus}
          </p>
        )}
        {offersError && <p className="form-error">{offersError}</p>}
        {!canManageOffers && <p className="inline-status">Offers are managed by mustafajafridi@gmail.com.</p>}
        {canManageOffers && <Glass className="import-card">
          <label className="upload-label">
            <UploadCloud size={21} />
            {importing && importDraft ? `Reading page ${Math.min(importDraft.nextPage+1,importDraft.pageCount)} of ${importDraft.pageCount}…` : importDraft && importDraft.nextPage < importDraft.pageCount ? `Resume ${importDraft.fileName}` : "Import offers from PDF"}
            <input
              type="file"
              accept="application/pdf"
              hidden
              disabled={importing}
              onChange={(e) => {
                void chooseFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <small>
            PDF stays in your browser until sent to Firebase AI Logic for
            extraction.
          </small>
        </Glass>}
        {canManageOffers && importDraft && <p className="inline-status" role="status">{importDraft.nextPage} of {importDraft.pageCount} pages processed · {importDraft.offers.length} supported plans found. {importDraft.sourceDate && `Effective ${importDraft.sourceDate}.`}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {canManageOffers && preview && (
          <Glass className="import-preview">
            <div className="section-title">
              <h2>{preview.length} offers found</h2>
              <button
                onClick={() => {setPreview(null);setImportDraft(null);saveImportDraft(null);}}
                aria-label="Cancel import"
              >
                <X size={17} />
              </button>
            </div>
            <p>
              Review prices and eligibility against the PDF. Saving updates this rate sheet and retires older imported rows that are no longer present.
            </p>
            <ul>
              {preview.map((o, i) => (
                <li key={i}><strong>{o.title}</strong><br/>{o.brand} · {o.customer_segments.join(', ') || 'all customers'} · {o.services.join(', ')} · {o.data_allowance} · {o.plan_code} · page {o.source_page}<br/>{o.pricing}<br/>{o.eligibility && <em>{o.eligibility}</em>}</li>
              ))}
            </ul>
            <GradientButton
              disabled={importing}
              onClick={() => void commitImport()}
            >
              {importing ? "Saving…" : `Import ${preview.length} offers`}
            </GradientButton>
          </Glass>
        )}
        {canManageOffers && <Glass className="offer-form">
          <div className="section-title"><h2>{editingOffer ? 'Edit offer' : 'Add an offer'}</h2>{editingOffer && <button type="button" onClick={() => {setEditingOffer(null);setForm(emptyOffer());}} aria-label="Cancel editing"><X size={17}/></button>}</div>
          <form onSubmit={create}>
            <label>
              Offer title
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Virgin 60GB plan"
              />
            </label>
            <label>
              Details
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What does this offer include?"
              />
            </label>
            <label>
              Plan code <span>Optional</span>
              <input value={form.plan_code || ''} maxLength={80} onChange={(e) => setForm({...form,plan_code:e.target.value})} placeholder="SOC or plan code" />
            </label>
            <label>
              Data allowance <span>Optional</span>
              <input value={form.data_allowance || ''} maxLength={80} onChange={(e) => setForm({...form,data_allowance:e.target.value})} placeholder="e.g. 60GB or Unlimited" />
            </label>
            <label>
              Pricing <span>Line 1 is the default rate</span>
              <textarea rows={3} maxLength={1000} value={form.pricing || ''} onChange={(e) => setForm({...form,pricing:e.target.value})} placeholder="Gross price, Line 1 net, additional lines and conditions" />
            </label>
            <label>
              Eligibility <span>Optional</span>
              <textarea rows={3} maxLength={800} value={form.eligibility || ''} onChange={(e) => setForm({...form,eligibility:e.target.value})} placeholder="Who qualifies and how to verify" />
            </label>
            <div className="field-label">Brand</div>
            <div className="chip-row">
              {(["both", "bell", "virgin"] as OfferBrand[]).map((v) => (
                <button
                  type="button"
                  key={v}
                  className={`chip ${form.brand === v ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, brand: v })}
                >
                  {v === "both"
                    ? "Both brands"
                    : v === "bell"
                      ? "Bell"
                      : "Virgin Plus"}
                </button>
              ))}
            </div>
            <div className="field-label">Services</div>
            <div className="chip-row">
              {SERVICES.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={`chip ${form.services.includes(s.id) ? "selected" : ""}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      services: form.services.includes(s.id)
                        ? form.services.filter((x) => x !== s.id)
                        : [...form.services, s.id],
                    })
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="field-label">
              Who qualifies <small>Blank means everyone</small>
            </div>
            <div className="chip-row">
              {CUSTOMER_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`chip ${form.customer_segments.includes(t.id) ? "selected" : ""}`}
                  onClick={() =>
                    setForm({
                      ...form,
                      customer_segments: form.customer_segments.includes(t.id)
                        ? form.customer_segments.filter((x) => x !== t.id)
                        : [...form.customer_segments, t.id],
                    })
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label>
              Valid until <span>Optional</span>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) =>
                  setForm({ ...form, valid_until: e.target.value })
                }
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <GradientButton type="submit" disabled={busy || !form.title.trim()}>
              {busy ? "Saving…" : editingOffer ? "Save changes" : "Add offer"} <Plus size={17} />
            </GradientButton>
          </form>
        </Glass>}
        <div className="list-head">
          <h2>
            Current library <span>{offers.length}</span>
          </h2>
        </div>
        {offers.length ? (
          offers.map((offer) => (
            <Glass
              className={`offer-item ${offer.valid_until && offer.valid_until < todayStr() ? "expired" : ""}`}
              key={offer.id}
            >
              <div className="offer-item-top">
                <h3>{offer.title}</h3>
                {canManageOffers && <div className="offer-item-actions"><button
                  onClick={() => startEditing(offer)}
                  aria-label={`Edit ${offer.title}`}
                >
                  <Pencil size={17} />
                </button><button
                  onClick={() => void remove(offer)}
                  aria-label={`Delete ${offer.title}`}
                >
                  <Trash2 size={17} />
                </button></div>}
              </div>
              <BrandBadge brand={offer.brand} />
              <p>{offer.description || "No description yet."}</p>
              {(offer.pricing || offer.eligibility || offer.plan_code) && <details className="offer-details">
                <summary>Pricing and eligibility</summary>
                {offer.plan_code && <p><strong>Plan code:</strong> {offer.plan_code}{offer.data_allowance && ` · ${offer.data_allowance}`}</p>}
                {offer.pricing && <p><strong>Pricing:</strong> {offer.pricing}</p>}
                {offer.eligibility && <p><strong>Eligibility:</strong> {offer.eligibility}</p>}
                {offer.source_date && <p><strong>Rate sheet effective:</strong> {offer.source_date}</p>}
              </details>}
              <div className="chip-row">
                {offer.services.map((s) => (
                  <span key={s} className="chip simple">
                    {SERVICES.find((x) => x.id === s)?.label || s}
                  </span>
                ))}
                {offer.customer_segments.map((c) => (
                  <span key={c} className="chip segment">
                    {CUSTOMER_TYPES.find((x) => x.id === c)?.label || c}
                  </span>
                ))}
              </div>
              <small>
                {offer.valid_until
                  ? offer.valid_until < todayStr()
                    ? "Expired"
                    : `Until ${dateText(offer.valid_until)}`
                  : "Ongoing"}
              </small>
            </Glass>
          ))
        ) : (
          <Glass className="empty-state">
            <h3>No offers yet</h3>
            <p>Add an offer or import a rate sheet to power live scoring.</p>
          </Glass>
        )}
      </main>
    </>
  );
}
function AccountPage() {
  const { user, notify } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(user.displayName || "");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      notify("Profile saved.");
    } catch (cause) {
      notify(err(cause), "error");
    } finally {
      setBusy(false);
    }
  }
  async function runTest() {
    setAiBusy(true);
    setAiResult("");
    try {
      setAiResult(await testAI());
    } catch (cause) {
      setAiResult(`Test failed: ${err(cause)}`);
    } finally {
      setAiBusy(false);
    }
  }
  return (
    <>
      <TopBar />
      <main className="page account-page">
        <button className="back-link" onClick={() => navigate("/")}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="eyebrow">YOUR WORKSPACE</div>
        <h1>
          Your <span className="text-gradient">account.</span>
        </h1>
        <Glass className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar">
              {(user.displayName || user.email || "R").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2>{user.displayName || "RedLeads rep"}</h2>
              <p>Team member</p>
            </div>
          </div>
          <form onSubmit={save}>
            <label>
              Full name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <label>
              Email address
              <input value={user.email || ""} readOnly />
            </label>
            <GradientButton
              type="submit"
              disabled={busy || name.trim() === (user.displayName || "")}
            >
              {busy ? "Saving…" : "Save changes"}
            </GradientButton>
          </form>
          {!user.emailVerified && (
            <p className="verification-note">
              <Mail size={16} /> Email not verified.{" "}
              <button
                onClick={() =>
                  void sendEmailVerification(user)
                    .then(() => notify("Verification email sent."))
                    .catch((cause) => notify(err(cause), "error"))
                }
              >
                Resend link
              </button>
            </p>
          )}
        </Glass>
        <Glass className="account-tool">
          <h2>
            <Sparkles size={19} /> AI connection
          </h2>
          <p>
            Send a harmless prompt to check Firebase AI Logic. No lead data is
            included.
          </p>
          <button
            className="secondary-wide"
            disabled={aiBusy}
            onClick={() => void runTest()}
          >
            {aiBusy ? "Waiting for AI…" : "Test AI Logic"}
          </button>
          {aiResult && (
            <p className="ai-result" role="status">
              {aiResult}
            </p>
          )}
        </Glass>
        <button className="logout-button" onClick={() => void signOut(auth)}>
          <LogOut size={18} /> Log out
        </button>
      </main>
    </>
  );
}
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        <Route
          path="/welcome"
          element={
            <Protected>
              <Welcome />
            </Protected>
          }
        />
        <Route
          path="/"
          element={
            <Protected>
              <Home />
            </Protected>
          }
        />
        <Route
          path="/log"
          element={
            <Protected>
              <LeadWizard />
            </Protected>
          }
        />
        <Route
          path="/leads/:id/edit"
          element={
            <Protected>
              <LeadWizard edit />
            </Protected>
          }
        />
        <Route
          path="/offers"
          element={
            <Protected>
              <OffersPage />
            </Protected>
          }
        />
        <Route
          path="/account"
          element={
            <Protected>
              <AccountPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRoutes;
