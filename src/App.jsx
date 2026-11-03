import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updatePassword,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FolderKanban,
  Globe2,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { auth, authReady, db } from "./services";
import { configured } from "./config";
const today = () => new Date().toISOString().slice(0, 10),
  initials = (n) => (n || "PV").trim().slice(0, 2).toUpperCase(),
  projectsPath = (uid) => `users/${uid}/projects`,
  profilePath = (uid) => `users/${uid}/profile/main`,
  dateLabel = (d) =>
    new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${d}T12:00:00`));
const Error = ({ children }) =>
  children ? <p className="error">{children}</p> : null;
const Empty = ({ children }) => <p className="empty-copy">{children}</p>;
function streak(history = []) {
  const s = new Set(history);
  let n = 0,
    d = new Date(`${today()}T12:00:00Z`);
  if (!s.has(today())) d.setUTCDate(d.getUTCDate() - 1);
  while (s.has(d.toISOString().slice(0, 10))) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}
function Logo() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <img src="/project-vault-mascot.png" alt="Project Vault" />
      </span>
      <span>
        Project Vault<small>YOUR CONSISTENCY SPACE</small>
      </span>
    </div>
  );
}
function Sheet({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="sheet"
        role="dialog"
        aria-modal="true"
        tabIndex="-1"
        ref={ref}
      >
        <div className="sheet-handle" />
        <div className="sheet-title">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function Info({ label, value }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function Login({ preview }) {
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login">
      <Logo />
      <p className="eyebrow">PROJECT INTELLIGENCE, MADE CALM</p>
      <h1>
        Build a habit
        <br />
        around your work.
      </h1>
      <p className="muted">
        A private home for the projects you follow and show up for.
      </p>
      <section className="card login-card">
        <div className="auth-tabs">
          <button
            className={!signup ? "active" : ""}
            onClick={() => setSignup(false)}
          >
            Log in
          </button>
          <button
            className={signup ? "active" : ""}
            onClick={() => setSignup(true)}
          >
            Create account
          </button>
        </div>
        <button
          className="google-button"
          onClick={() =>
            run(() => signInWithPopup(auth, new GoogleAuthProvider()))
          }
          disabled={busy}
        >
          <span>G</span>Continue with Google
        </button>
        <div className="divider">
          <i />
          or continue with email
          <i />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (signup && f.get("password") !== f.get("confirm"))
              return setError("Passwords do not match.");
            run(async () => {
              await authReady;
              return (
                signup
                  ? createUserWithEmailAndPassword
                  : signInWithEmailAndPassword
              )(auth, email, f.get("password"));
            });
          }}
        >
          <label>
            Email address
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
            <input name="password" type="password" minLength="6" required />
          </label>
          {signup && (
            <>
              <label>
                Confirm password
                <input name="confirm" type="password" minLength="6" required />
              </label>
              <label className="terms">
                <input type="checkbox" required />I agree to the terms and
                privacy policy.
              </label>
            </>
          )}
          <Error>{error}</Error>
          <button className="primary full" disabled={busy}>
            {busy ? "Please wait…" : signup ? "Create my space" : "Log in"}
            <ChevronRight size={18} />
          </button>
        </form>
      </section>
      {!configured && (
        <button className="text-button" onClick={preview}>
          Open preview
        </button>
      )}
    </div>
  );
}
function ProjectMark({ name }) {
  return <span className="project-mark">{initials(name)}</span>;
}
function ProfileMenu({ profile, user, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const changePassword = async () => {
    const next = window.prompt("Enter a new password (6+ characters):");
    if (!next) return;
    if (next.length < 6)
      return window.alert("Password must be at least 6 characters.");
    try {
      await updatePassword(auth.currentUser, next);
      window.alert("Password updated.");
    } catch (e) {
      window.alert("For security, log in again before changing your password.");
    }
  };
  return (
    <div className="account-menu">
      <button
        className="user-button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {initials(profile.name || user?.displayName || user?.email)}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="account-popover">
          <div className="account-popover-head">
            <b>{profile.name || user?.displayName || "Your account"}</b>
            <small>{user?.email || "Preview mode"}</small>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onNavigate("profile");
            }}
          >
            <UserRound size={16} />
            Profile
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onNavigate("settings");
            }}
          >
            <Settings size={16} />
            Settings
          </button>
          {user && (
            <button onClick={changePassword}>
              <Settings size={16} />
              Change password
            </button>
          )}
          {user && (
            <button onClick={onLogout}>
              <LogOut size={16} />
              Log out
            </button>
          )}
        </div>
      )}
    </div>
  );
}
function ProfileEditor({ profile, onSave, onClose }) {
  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <p className="muted">
        Keep only the details you want to share with your project space.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await onSave({
            name: f.get("name").trim(),
            phone: f.get("phone").trim(),
            bio: f.get("bio").trim(),
          });
          onClose();
        }}
      >
        <label>
          Display name
          <input
            name="name"
            required
            maxLength="60"
            defaultValue={profile.name || ""}
            placeholder="Your name"
          />
        </label>
        <label>
          Mobile number
          <input
            name="phone"
            type="tel"
            maxLength="24"
            defaultValue={profile.phone || ""}
            placeholder="+91 98765 43210"
          />
        </label>
        <label>
          Bio
          <input
            name="bio"
            maxLength="180"
            defaultValue={profile.bio || ""}
            placeholder="A short line about you"
          />
        </label>
        <button className="primary full">
          Save profile
          <Check size={18} />
        </button>
      </form>
    </Sheet>
  );
}
function AddCatalog({ onClose, onSave }) {
  return (
    <Sheet title="Publish a project" onClose={onClose}>
      <p className="muted">Add a project to the shared discovery catalog.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await onSave({
            name: f.get("name").trim(),
            category: f.get("category"),
            description: f.get("description").trim(),
            xUrl: f.get("xUrl").trim(),
            funding: f.get("funding").trim(),
            investors: f.get("investors").trim(),
            status: "active",
          });
          onClose();
        }}
      >
        <label>
          Project name
          <input name="name" required maxLength="70" />
        </label>
        <label>
          Category
          <select name="category">
            <option>Crypto & web3</option>
            <option>AI</option>
            <option>Design</option>
            <option>Developer tools</option>
            <option>Community</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          Description
          <input name="description" required maxLength="280" />
        </label>
        <label>
          Project link
          <input name="xUrl" type="url" />
        </label>
        <label>
          Funding
          <input name="funding" maxLength="120" />
        </label>
        <label>
          Investors
          <input name="investors" maxLength="240" />
        </label>
        <button className="primary full">
          Publish project
          <Plus size={18} />
        </button>
      </form>
    </Sheet>
  );
}
function CatalogCard({ project, joined, onJoin }) {
  return (
    <article className="catalog-card card">
      <div className="catalog-head">
        <ProjectMark name={project.name} />
        <span className="category-pill">{project.category}</span>
      </div>
      <h2>{project.name}</h2>
      <p>{project.description || "A project worth following."}</p>
      <div className="catalog-meta">
        <span>{project.funding || "Funding not listed"}</span>
        <span>{project.investors || "Investors not listed"}</span>
      </div>
      <button
        className={`${joined ? "secondary" : "primary"} full`}
        disabled={joined}
        onClick={onJoin}
      >
        {joined ? (
          <>
            <Check size={17} />
            Joined
          </>
        ) : (
          <>
            <Plus size={17} />
            Join project
          </>
        )}
      </button>
    </article>
  );
}
function ProjectCard({ project, onOpen }) {
  const done = project.history?.includes(today());
  return (
    <button className="project-card" onClick={onOpen}>
      <div className="project-head">
        <ProjectMark name={project.name} />
        <span className={`status ${done ? "done" : ""}`}>
          {done ? (
            <>
              <Check size={13} />
              Today done
            </>
          ) : (
            <>
              <Clock3 size={13} />
              Pending
            </>
          )}
        </span>
      </div>
      <h2>{project.name}</h2>
      <p>{project.category}</p>
      <div className="card-stats">
        <span>
          <b>{streak(project.history)}</b> day streak
        </span>
        <span>
          <b>{project.history?.length || 0}</b> check-ins
        </span>
      </div>
      <div className="project-foot">
        Manage project
        <ChevronRight size={17} />
      </div>
    </button>
  );
}
function Detail({ project, save, onLeave, onBack }) {
  const done = project.history?.includes(today()),
    [note, setNote] = useState("");
  return (
    <>
      <button className="back" onClick={onBack}>
        ← Manage projects
      </button>
      <section className="detail-hero">
        <ProjectMark name={project.name} />
        <div>
          <p className="eyebrow">{project.category}</p>
          <h1>{project.name}</h1>
          <p>Joined {dateLabel(project.joinDate)}</p>
        </div>
      </section>
      <div className="detail-grid">
        <section className="card focus-card">
          <p className="eyebrow">TODAY’S CONSISTENCY</p>
          <h2>{done ? "You showed up." : "Make today count."}</h2>
          <div className="streak-number">
            <span>✦</span>
            <b>{streak(project.history)}</b>
            <small>day streak</small>
          </div>
          <button
            className={`primary full ${done ? "complete" : ""}`}
            disabled={done}
            onClick={() =>
              save({ history: [...(project.history || []), today()] })
            }
          >
            {done ? (
              <>
                <Check size={18} />
                Complete for today
              </>
            ) : (
              <>
                <Check size={18} />
                Mark today complete
              </>
            )}
          </button>
        </section>
        <section className="card reminder-card">
          <Bell size={22} />
          <p className="eyebrow">DAILY REMINDER</p>
          <h2>
            {project.reminderEnabled ? "Reminder is on" : "Set your rhythm."}
          </h2>
          <label>
            Time
            <input
              type="time"
              value={project.reminderTime || "20:00"}
              onChange={(e) => save({ reminderTime: e.target.value })}
            />
          </label>
          <button
            className="secondary full"
            onClick={async () => {
              let ok = Notification?.permission === "granted";
              if (!ok)
                ok = (await Notification.requestPermission()) === "granted";
              save({ reminderEnabled: ok });
            }}
          >
            {project.reminderEnabled ? "Reminder enabled" : "Enable reminders"}
          </button>
        </section>
      </div>
      <div className="content-grid">
        <section className="card history">
          <div className="section-head">
            <div>
              <p className="eyebrow">HISTORY</p>
              <h2>Consistency trail</h2>
            </div>
            <span>{project.history?.length || 0} days</span>
          </div>
          {project.history?.length ? (
            [...(project.history || [])]
              .reverse()
              .slice(0, 12)
              .map((d) => (
                <div className="history-item" key={d}>
                  <Check size={15} />
                  <b>{dateLabel(d)}</b>
                </div>
              ))
          ) : (
            <Empty>Your completed days appear here.</Empty>
          )}
        </section>
        <section className="card intelligence">
          <p className="eyebrow">PROJECT INTELLIGENCE</p>
          <h2>Funding & people</h2>
          <Info label="Funding" value={project.funding || "Not added yet"} />
          <Info
            label="Investors"
            value={project.investors || "Not added yet"}
          />
          <Info label="Joined" value={dateLabel(project.joinDate)} />
          <button className="text-button leave" onClick={onLeave}>
            Leave this project
          </button>
        </section>
        <section className="card updates">
          <p className="eyebrow">COMMUNITY NOTES</p>
          <h2>Keep the signal</h2>
          <form
            className="note-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (note.trim()) {
                save({
                  updates: [
                    { text: note.trim(), date: today() },
                    ...(project.updates || []),
                  ],
                });
                setNote("");
              }
            }}
          >
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Save an update or insight…"
            />
            <button className="primary">
              <Plus size={17} />
            </button>
          </form>
          {project.updates?.map((u, i) => (
            <p className="update-line" key={i}>
              {dateLabel(u.date)} · {u.text}
            </p>
          ))}
        </section>
      </div>
    </>
  );
}
function Analytics({ projects }) {
  const total = projects.reduce((n, p) => n + (p.history?.length || 0), 0),
    best = Math.max(0, ...projects.map((p) => streak(p.history))),
    done = projects.filter((p) => p.history?.includes(today())).length;
  return (
    <section>
      <p className="eyebrow">YOUR ANALYTICS</p>
      <h1>Progress, made visible.</h1>
      <p className="muted">
        A focused view of the consistency you are building.
      </p>
      <div className="analytics-grid">
        <Metric icon={CalendarDays} label="TOTAL CHECK-INS" value={total} />
        <Metric icon={Sparkles} label="BEST STREAK" value={`${best} days`} />
        <Metric
          icon={Check}
          label="TODAY"
          value={`${done}/${projects.length}`}
        />
      </div>
      <section className="card insight-card">
        <div>
          <p className="eyebrow">NEXT BEST ACTION</p>
          <h2>
            {projects.length === 0
              ? "Join a project to begin."
              : done === projects.length
                ? "Your daily check-ins are complete."
                : "Open Manage and complete today’s check-in."}
          </h2>
        </div>
        <TrendingUp size={38} />
      </section>
    </section>
  );
}
function Metric({ icon: Icon, label, value }) {
  return (
    <section className="card metric">
      <Icon size={21} />
      <p>{label}</p>
      <b>{value}</b>
    </section>
  );
}
function App() {
  const [user, setUser] = useState(null),
    [projects, setProjects] = useState([]),
    [catalog, setCatalog] = useState([]),
    [profile, setProfile] = useState({}),
    [admin, setAdmin] = useState(false),
    [page, setPage] = useState("manage"),
    [selected, setSelected] = useState(null),
    [modal, setModal] = useState(""),
    [loading, setLoading] = useState(configured),
    [preview, setPreview] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const t = await u.getIdTokenResult();
        setAdmin(t.claims?.admin === true || u.email?.toLowerCase() === "sassyurs19@gmail.com");
      } else setAdmin(false);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    const a = onSnapshot(collection(db, projectsPath(user.uid)), (s) =>
        setProjects(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      b = onSnapshot(doc(db, profilePath(user.uid)), (s) =>
        setProfile(s.exists() ? s.data() : {}),
      ),
      c = onSnapshot(collection(db, "catalogProjects"), (s) =>
        setCatalog(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      );
    return () => {
      a();
      b();
      c();
    };
  }, [user]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const demo = useMemo(
      () => [
        {
          id: "demo",
          name: "Lumen",
          category: "AI",
          description: "A calm workspace for thoughtful AI builders.",
          funding: "Seed · $6M",
          investors: "Northstar, Bloom",
        },
      ],
      [],
    ),
    list = preview ? demo : projects,
    cat = preview ? demo : catalog,
    active = list.find((p) => p.id === selected);
  const save = async (patch) => {
      if (!preview)
        await updateDoc(doc(db, projectsPath(user.uid), selected), patch);
      setToast("Saved");
    },
    join = async (c) => {
      if (!preview)
        await addDoc(collection(db, projectsPath(user.uid)), {
          catalogId: c.id,
          name: c.name,
          category: c.category,
          joinDate: today(),
          funding: c.funding || "",
          investors: c.investors || "",
          reminderEnabled: false,
          reminderTime: "20:00",
          history: [],
          updates: [],
        });
      setToast("Project joined");
    },
    leave = async () => {
      if (!preview) await deleteDoc(doc(db, projectsPath(user.uid), selected));
      setSelected(null);
      setPage("manage");
      setToast("Project removed");
    },
    publish = async (data) => {
      if (!preview) await addDoc(collection(db, "catalogProjects"), data);
      setToast("Project published");
    },
    saveProfile = async (data) => {
      if (!preview)
        await setDoc(doc(db, profilePath(user.uid)), data, { merge: true });
      setProfile(data);
      setToast("Profile updated");
    };
  const changePassword = async () => {
    const next = window.prompt("Enter a new password (6+ characters):");
    if (!next) return;
    if (next.length < 6) return window.alert("Password must be at least 6 characters.");
    try {
      await updatePassword(auth.currentUser, next);
      setToast("Password updated");
    } catch {
      window.alert("For security, log in again before changing your password.");
    }
  };
  if (loading) return <div className="loading">Opening your space…</div>;
  if (!user && !preview) return <Login preview={() => setPreview(true)} />;
  const nav = [
      ["discover", Globe2, "Discover"],
      ["manage", FolderKanban, "Manage"],
      ["analytics", BarChart3, "Analytics"],
      ["reminders", Bell, "Reminders"],
      ...(admin ? [["admin", ShieldCheck, "Admin"]] : []),
    ],
    mobile = [
      ["discover", Globe2, "Discover"],
      ["manage", FolderKanban, "Manage"],
      ["analytics", BarChart3, "Analytics"],
      ["profile", UserRound, "Profile"],
    ];
  return (
    <div className="app">
      <header>
        <Logo />
        <div className="header-actions">
          <button
            className="bell"
            onClick={() => setPage("reminders")}
            aria-label="Reminders"
          >
            <Bell size={19} />
          </button>
          <ProfileMenu
            profile={profile}
            user={user}
            onNavigate={setPage}
            onLogout={() => signOut(auth)}
          />
        </div>
      </header>
      <div className="shell">
        <aside>
          <p className="eyebrow">YOUR SPACE</p>
          {nav.map(([id, I, l]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              <I size={19} />
              {l}
            </button>
          ))}
          <div className="aside-note">
            <Sparkles size={17} />
            Consistency is a quiet superpower.
          </div>
        </aside>
        <main>
          {preview && (
            <div className="preview">
              <span>Preview mode · changes are not saved</span>
              <button onClick={() => setPreview(false)}>Sign in</button>
            </div>
          )}
          {page === "discover" && (
            <>
              <p className="eyebrow">PROJECT CATALOG</p>
              <h1>
                Find your next
                <br />
                <em>focus.</em>
              </h1>
              <p className="muted">
                Join a project to start your private streak.
              </p>
              <div className="catalog-grid">
                {cat.length ? (
                  cat.map((c) => (
                    <CatalogCard
                      key={c.id}
                      project={c}
                      joined={list.some((p) => p.catalogId === c.id)}
                      onJoin={() => join(c)}
                    />
                  ))
                ) : (
                  <Empty>The catalog is being curated.</Empty>
                )}
              </div>
            </>
          )}
          {page === "manage" && (
            <>
              <div className="page-head">
                <div>
                  <p className="eyebrow">MY PROJECTS</p>
                  <h1>
                    Manage your
                    <br />
                    <em>momentum.</em>
                  </h1>
                  <p>
                    Every joined project, one intentional daily action at a
                    time.
                  </p>
                </div>
                <button
                  className="primary add"
                  onClick={() => setPage("discover")}
                >
                  <Plus size={18} />
                  Join project
                </button>
              </div>
              <div className="overview">
                <div>
                  <p>JOINED PROJECTS</p>
                  <b>{list.length}</b>
                </div>
                <div>
                  <p>CHECK-INS</p>
                  <b>
                    {list.reduce((n, p) => n + (p.history?.length || 0), 0)}
                  </b>
                </div>
                <div>
                  <p>BEST STREAK</p>
                  <b>
                    {Math.max(0, ...list.map((p) => streak(p.history)))}{" "}
                    <small>days</small>
                  </b>
                </div>
              </div>
              {list.length ? (
                <div className="project-grid">
                  {list.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onOpen={() => {
                        setSelected(p.id);
                        setPage("detail");
                      }}
                    />
                  ))}
                </div>
              ) : (
                <section className="card empty-state">
                  <h2>Join a project you care about.</h2>
                  <button
                    className="primary"
                    onClick={() => setPage("discover")}
                  >
                    <Globe2 size={18} />
                    Explore projects
                  </button>
                </section>
              )}
            </>
          )}
          {page === "detail" && active && (
            <Detail
              project={active}
              save={save}
              onLeave={leave}
              onBack={() => setPage("manage")}
            />
          )}{" "}
          {page === "analytics" && <Analytics projects={list} />}{" "}
          {page === "reminders" && (
            <section className="narrow">
              <p className="eyebrow">YOUR RHYTHM</p>
              <h1>Reminders</h1>
              <p className="muted">
                Choose a project to set its daily reminder.
              </p>
              <div className="reminder-list">
                {list.map((p) => (
                  <button
                    className="card reminder-line"
                    key={p.id}
                    onClick={() => {
                      setSelected(p.id);
                      setPage("detail");
                    }}
                  >
                    <ProjectMark name={p.name} />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.reminderEnabled
                          ? `Daily at ${p.reminderTime}`
                          : "No reminder set"}
                      </small>
                    </span>
                    <ChevronRight />
                  </button>
                ))}
              </div>
            </section>
          )}
          {page === "admin" && admin && (
            <section>
              <div className="page-head">
                <div>
                  <p className="eyebrow">ADMIN WORKSPACE</p>
                  <h1>
                    Publish the
                    <br />
                    <em>catalog.</em>
                  </h1>
                  <p>Create shared projects members can discover and join.</p>
                </div>
                <button
                  className="primary add"
                  onClick={() => setModal("catalog")}
                >
                  <Plus size={18} />
                  New project
                </button>
              </div>
              <section className="card admin-note">
                <ShieldCheck size={22} />
                <div>
                  <b>Protected publisher area</b>
                  <p>
                    Only Firebase accounts with the admin claim can publish.
                  </p>
                </div>
              </section>
              <div className="admin-list">
                {cat.map((c) => (
                  <section className="card admin-row" key={c.id}>
                    <ProjectMark name={c.name} />
                    <span>
                      <b>{c.name}</b>
                      <small>
                        {c.category} · {c.status || "active"}
                      </small>
                    </span>
                    <UsersRound size={18} />
                  </section>
                ))}
              </div>
            </section>
          )}
          {page === "profile" && (
            <section className="narrow">
              <p className="eyebrow">YOUR ACCOUNT</p>
              <h1>Profile</h1>
              <section className="card profile">
                <span className="profile-avatar">
                  {initials(profile.name || user?.displayName || user?.email)}
                </span>
                <h2>{profile.name || user?.displayName || "Project keeper"}</h2>
                <p>
                  {profile.bio || "Add a short bio to personalize your space."}
                </p>
                <Info label="Email" value={user?.email || "Preview mode"} />
                <Info label="Mobile" value={profile.phone || "Not added"} />
                <button
                  className="primary full"
                  onClick={() => setModal("profile")}
                >
                  Edit profile
                </button>
              </section>
            </section>
          )}
          {page === "settings" && (
            <section className="narrow">
              <p className="eyebrow">PREFERENCES</p>
              <h1>Settings</h1>
              <section className="card settings-card">
                <h2>Only the essentials.</h2>
                <Info label="Reminders" value="Managed per project" />
                <Info label="Account data" value="Saved privately" />
                <button className="secondary full" onClick={changePassword}>
                  Change password
                </button>
                <button
                  className="secondary full"
                  onClick={() => signOut(auth)}
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </section>
            </section>
          )}
        </main>
      </div>
      <nav className="bottom-nav">
        {mobile.map(([id, I, l]) => (
          <button
            key={id}
            className={page === id ? "active" : ""}
            onClick={() => setPage(id)}
          >
            <I size={20} />
            {l}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal === "catalog" && (
        <AddCatalog onClose={() => setModal("")} onSave={publish} />
      )}{" "}
      {modal === "profile" && (
        <ProfileEditor
          profile={profile}
          onClose={() => setModal("")}
          onSave={saveProfile}
        />
      )}
    </div>
  );
}
export default App;
