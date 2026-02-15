import { useEffect, useMemo, useRef, useState } from "react";
import authBg from "../../bg/virus-protection.jpg";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTH_STORAGE_KEY = "linkvault_auth";
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tokenRegex = /^[a-f0-9]{32}$/i;

const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const authFromStorage = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { token: "", user: null };
    return JSON.parse(raw);
  } catch (_error) {
    return { token: "", user: null };
  }
};

const persistAuth = (auth) => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
const clearAuth = () => localStorage.removeItem(AUTH_STORAGE_KEY);

const apiJson = async ({ path, method = "GET", token = "", body }) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
};

const countLabel = (post) => `${post.viewCount || 0} views | ${post.downloadCount || 0} downloads | ${post.reportCount || 0} reports`;
const navClass = (isActive) =>
  `btn-glow rounded-xl border px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? "border-sky-400 bg-sky-500 text-white shadow-lg shadow-sky-500/30"
      : "border-white/35 bg-white/15 text-white hover:bg-white/25"
  }`;

const appPanel = "card-shell rounded-3xl border border-white/35 bg-white/92 p-7 shadow-2xl shadow-slate-950/25";
const inputClass =
  "rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200";
const statCardClass =
  "rounded-2xl border border-sky-300/25 bg-gradient-to-br from-sky-700 via-blue-800 to-slate-900 p-4 text-white shadow-lg shadow-blue-900/40";

const FileIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
    <path d="M14 2v5h5" />
  </svg>
);

const TextIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M4 6h16M9 6v12M15 6v12M6 18h12" />
  </svg>
);

const ClockIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const CopyIcon = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const AuthScreen = ({ onAuth }) => {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        if (name.trim().length < 2 || name.trim().length > 60) throw new Error("Name must be between 2 and 60 characters.");
      }
      if (!emailRegex.test(email.trim().toLowerCase())) throw new Error("Invalid email format.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (password.length > 128) throw new Error("Password must be less than 129 characters.");

      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const data = await apiJson({ path, method: "POST", body });
      onAuth(data);
      window.location.href = data.user?.role === "admin" ? "/admin" : "/dashboard";
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vault-page min-h-screen">
      <img src={authBg} alt="LinkVault background" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-900/60 to-slate-950/80" />
      <div className="vault-orb orb-a" />
      <div className="vault-orb orb-b" />
      <div className="vault-orb orb-c" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-start px-4 py-16 sm:px-8">
        <div className="w-full max-w-xl">
          <div className="auth-form-shell text-white">
            <h1 className="mb-3 text-center text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl bg-gradient-to-r from-sky-300 via-blue-200 to-cyan-300 bg-clip-text">LinkVault</h1>
            <h2 className="mb-1 text-2xl font-semibold text-slate-100">Secure Access Portal</h2>
            <p className="mb-6 text-sm text-slate-300">Sign in to manage protected links and reports.</p>
            <div className="mb-8 inline-flex rounded-full border border-white/15 bg-slate-800/70 p-1.5 text-sm">
              <button
                type="button"
                className={`rounded-full px-5 py-2 font-medium transition ${mode === "login" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30" : "text-slate-300 hover:bg-white/10"}`}
                onClick={() => setMode("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`rounded-full px-5 py-2 font-medium transition ${mode === "register" ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30" : "text-slate-300 hover:bg-white/10"}`}
                onClick={() => setMode("register")}
              >
                Sign Up
              </button>
            </div>

            <form className="grid gap-6" onSubmit={submit}>
              {mode === "register" ? (
                <label className="grid gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Your name</span>
                  <input
                    className="auth-input rounded-xl border border-slate-500/70 bg-slate-800/70 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Your email</span>
                <input
                  className="auth-input rounded-xl border border-slate-500/70 bg-slate-800/70 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
                  type="email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Your password</span>
                <input
                  className="auth-input rounded-xl border border-slate-500/70 bg-slate-800/70 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {error ? <p className="text-sm text-red-300">{error}</p> : null}

              <button
                className="btn-glow auth-cta mt-2 rounded-full bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/35 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <p className="mt-8 text-xs text-slate-400">Privacy · Terms · Support</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppShell = ({ auth, onLogout, children, pathname }) => {
  const isAdmin = auth.user?.role === "admin";
  return (
    <div className="vault-page min-h-screen">
      <div className="vault-orb orb-a" />
      <div className="vault-orb orb-b" />
      <div className="vault-orb orb-c" />
    <div className="relative z-10 mx-auto min-h-screen max-w-[95rem] w-full px-5 py-10">
      <div className="hero-glass mb-6 rounded-3xl px-5 py-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-sky-200">Link Security Platform</p>
          <h1 className="text-5xl font-bold tracking-tight">LinkVault</h1>
          <p className="text-sm text-slate-100">
            {auth.user?.name} ({auth.user?.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={navClass(pathname === "/upload")} href="/upload">
            Upload
          </a>
          {!isAdmin ? (
            <>
              <a className={navClass(pathname === "/dashboard" || pathname === "/")} href="/dashboard">
                Dashboard
              </a>
              <a className={navClass(pathname === "/report")} href="/report">
                Report
              </a>
            </>
          ) : (
            <>
              <a className={navClass(pathname === "/admin" || pathname === "/" || pathname === "/dashboard")} href="/admin">
                Admin Dashboard
              </a>
              <a className={navClass(pathname === "/admin/reported")} href="/admin/reported">
                Reported Posts
              </a>
            </>
          )}
          <button className={navClass(false)} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      <div className="wave-ribbon a" />
      <div className="wave-ribbon b" />
      </div>
      {children}
    </div>
    </div>
  );
};

const CreateSharePage = ({ token }) => {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [oneTimeView, setOneTimeView] = useState(false);
  const [maxViews, setMaxViews] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const resultRef = useRef(null);

  const suggestedExpiry = useMemo(() => {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() + 30);
    return toLocalInputValue(dt);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      if (mode === "text" && text.trim().length > 20000) throw new Error("Text must be 20000 characters or less.");
      if (password.trim().length > 128) throw new Error("Password must be less than 129 characters.");
      if (maxViews.trim()) {
        const parsed = Number.parseInt(maxViews.trim(), 10);
        if (!Number.isFinite(parsed) || parsed <= 0) throw new Error("Maximum count must be a positive integer.");
      }

      const formData = new FormData();
      if (mode === "text") {
        if (!text.trim()) throw new Error("Text is required.");
        formData.append("text", text.trim());
      } else {
        if (!file) throw new Error("File is required.");
        formData.append("file", file);
      }
      if (expiresAt) formData.append("expiresAt", new Date(expiresAt).toISOString());
      if (password.trim()) formData.append("password", password.trim());
      if (maxViews.trim()) formData.append("maxViews", maxViews.trim());
      formData.append("oneTimeView", String(oneTimeView));

      const response = await fetch(`${API_BASE_URL}/api/shares`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create link");
      const nextResult = { ...data, appShareUrl: `${window.location.origin}/share/${data.token}` };
      setResult(nextResult);
      setText("");
      setFile(null);
      setExpiresAt("");
      setPassword("");
      setOneTimeView(false);
      setMaxViews("");
      setMode("text");
      setCopied(false);
      setUploadOpen(false);
    } catch (err) {
      setError(err.message || "Unable to create link");
    } finally {
      setLoading(false);
    }
  };

  const copyGeneratedLink = async () => {
    if (!result?.appShareUrl) return;
    try {
      await navigator.clipboard.writeText(result.appShareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setResult(null);
      }, 700);
    } catch (_error) {
      setError("Unable to copy link.");
    }
  };

  return (
    <div className="grid layout-spacious gap-7">
      <section className={appPanel}>
        <button
          type="button"
          className="btn-glow mb-5 flex w-full items-center justify-between rounded-2xl border border-sky-700/30 bg-gradient-to-r from-slate-900 via-blue-900 to-sky-900 p-5 text-left text-white"
          onClick={() => setUploadOpen((current) => !current)}
        >
          <div>
            <h2 className="text-3xl font-semibold">Upload</h2>
            <p className="mt-1 text-sm text-slate-100">Choose content type and generate a secure share link instantly.</p>
          </div>
          <span className="text-2xl leading-none">{uploadOpen ? "−" : "+"}</span>
        </button>

        {uploadOpen ? (
          <form onSubmit={submit}>
            <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-semibold text-slate-900">Content Type</p>
            <div className="flex gap-2">
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "text" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
                type="button"
                onClick={() => setMode("text")}
              >
                Text
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${mode === "file" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
                type="button"
                onClick={() => setMode("file")}
              >
                File
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            {mode === "text" ? (
              <>
                <p className="mb-2 text-sm font-semibold text-slate-900">Text Content</p>
                <textarea className={`${inputClass} min-h-40 w-full`} placeholder="Type or paste your text here..." value={text} onChange={(e) => setText(e.target.value)} />
              </>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold text-slate-900">Upload File</p>
                <input className={`${inputClass} w-full`} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Expiry</p>
            <input className={`${inputClass} w-full`} type="datetime-local" value={expiresAt} placeholder={suggestedExpiry} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Max Views/Downloads</p>
            <input className={`${inputClass} w-full`} type="number" min="1" placeholder="Optional" value={maxViews} onChange={(e) => setMaxViews(e.target.value)} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Password</p>
            <input className={`${inputClass} w-full`} type="password" placeholder="Optional" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={oneTimeView} onChange={(e) => setOneTimeView(e.target.checked)} />
              One-time view
            </label>
          </div>
            </div>

            {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
            <button
              className="btn-glow mt-5 w-full rounded-xl bg-sky-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Creating..." : "Generate Link"}
            </button>
          </form>
        ) : null}
      </section>

      <section id="generated-link" ref={resultRef} className={appPanel}>
        <h3 className="text-xl font-semibold text-slate-900">Generated Link</h3>
        {result ? (
          <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <a className="block break-all pr-2 text-base font-semibold text-sky-700" href={result.appShareUrl} target="_blank" rel="noreferrer">
                {result.appShareUrl}
              </a>
              <button
                type="button"
                title="Copy link"
                className="btn-glow inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-300 bg-white text-sky-700"
                onClick={copyGeneratedLink}
              >
                <CopyIcon />
              </button>
            </div>
            {copied ? <p className="mt-1 text-xs font-medium text-sky-700">Copied</p> : null}
            <p className="mt-2 text-sm text-slate-800">Post Token: {result.token}</p>
            <p className="text-sm text-slate-800">Expires at: {new Date(result.expiresAt).toLocaleString()}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No link generated yet. Submit the form above.</p>
        )}
      </section>
    </div>
  );
};

const IconPostItem = ({ post, selected, onSelect, className = "" }) => {
  const accessCount = Number(post.viewCount || 0) + Number(post.downloadCount || 0);
  const isExpired = post.expiresAt ? new Date(post.expiresAt).getTime() <= Date.now() : false;
  const badgeClass = selected
    ? "border-sky-500 bg-sky-50 text-sky-800"
    : "border-slate-300 bg-white text-slate-700";

  return (
    <button
      className={`card-shell rounded-2xl border p-3 text-left transition hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/60 ${badgeClass} ${className}`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-sky-700 text-white" : "bg-slate-900 text-white"}`}>
            {post.type === "text" ? <TextIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold">{post.type === "text" ? "Text Post" : "File Post"}</p>
            <p className="text-sm">Token: {post.token.slice(0, 12)}...</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${isExpired ? "text-rose-700" : "text-slate-600"}`}>
              <ClockIcon className="h-3.5 w-3.5" />
              {post.expiresAt ? `Expires: ${new Date(post.expiresAt).toLocaleString()}` : "No expiry"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide">Access</p>
          <p className="text-sm font-semibold">{accessCount}</p>
        </div>
      </div>
    </button>
  );
};

const PostDetailPanel = ({ post, canDelete = false, onDelete }) => {
  if (!post) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        Select a post to view details.
      </div>
    );
  }

  const link = `${window.location.origin}/share/${post.token}`;
  const accessLimitText = post.oneTimeView
    ? "Limit: 1 access (one-time)"
    : Number.isFinite(Number(post.maxViews)) && Number(post.maxViews) > 0
      ? `Limit: ${Number(post.maxViews)} views/downloads`
      : "Limit: Any number of times";
  return (
    <div className="card-shell rounded-2xl border border-slate-300 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-700 text-white">
            {post.type === "text" ? <TextIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{post.type === "text" ? "Text Post" : "File Post"}</p>
            <p className="text-sm text-slate-700">{countLabel(post)}</p>
            <p className="text-sm text-slate-700">{accessLimitText}</p>
          </div>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
          Token: {post.token.slice(0, 10)}...
        </div>
      </div>
      <p className="text-sm text-slate-700">Post Token: {post.token}</p>
      <a className="mt-1 block break-all text-sm font-medium text-sky-700" href={link} target="_blank" rel="noreferrer">
        {link}
      </a>
      <p className="mt-1 text-sm text-slate-700">Created: {new Date(post.createdAt).toLocaleString()}</p>
      <p className="mt-1 flex items-center gap-1 text-sm text-slate-700">
        <ClockIcon />
        Expires: {post.expiresAt ? new Date(post.expiresAt).toLocaleString() : "-"}
      </p>
      {post.type === "text" ? (
        <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">{post.text || ""}</pre>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>Name: {post.file?.originalName || "-"}</p>
          <p>Type: {post.file?.mimeType || "-"}</p>
          <p>Size: {post.file?.size || 0} bytes</p>
        </div>
      )}
      {canDelete ? (
        <button className="btn-glow mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700" onClick={() => onDelete(post.id)}>
          Delete Post
        </button>
      ) : null}
    </div>
  );
};

const UserDashboardPage = ({ token }) => {
  const [posts, setPosts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [listMode, setListMode] = useState("all");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiJson({ path: "/api/shares/mine", token });
      const items = data.items || [];
      setPosts(items);
      if (!items.length) {
        setSelectedId("");
      } else if (!items.some((item) => String(item.id) === String(selectedId))) {
        setSelectedId("");
      }
    } catch (err) {
      setError(err.message || "Unable to load posts");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deletePost = async (id) => {
    try {
      await apiJson({ path: `/api/shares/id/${id}`, method: "DELETE", token });
      if (String(selectedId) === String(id)) setSelectedId("");
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const textPosts = posts.filter((post) => post.type === "text").length;
  const filePosts = posts.filter((post) => post.type === "file").length;
  const reportedPosts = posts.filter((post) => Number(post.reportCount || 0) > 0);
  const visiblePosts = listMode === "reported" ? reportedPosts : posts;

  return (
    <div className={appPanel}>
      <div className="mb-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-4">
        <h2 className="text-2xl font-semibold text-slate-900">User Dashboard</h2>
        <p className="mt-1 text-sm text-slate-700">Click any post to reveal secure link details and actions.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-wide text-sky-200">Total Posts</p>
          <p className="mt-1 text-2xl font-bold">{posts.length}</p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-wide text-sky-200">Text Posts</p>
          <p className="mt-1 text-2xl font-bold">{textPosts}</p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-wide text-sky-200">File Posts</p>
          <p className="mt-1 text-2xl font-bold">{filePosts}</p>
        </div>
        <div className={statCardClass}>
          <p className="text-xs uppercase tracking-wide text-sky-200">Reported Posts</p>
          <p className="mt-1 text-2xl font-bold">{reportedPosts.length}</p>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {!posts.length ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">No posts yet. Create one from the Upload page.</div> : null}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex flex-row items-center gap-2">
        <button
          className={`rounded-xl px-4 py-2 text-left text-sm font-semibold ${listMode === "all" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => setListMode("all")}
        >
          All Posts
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-left text-sm font-semibold ${listMode === "reported" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => setListMode("reported")}
        >
          Reported Posts
        </button>
      </div>
      {listMode === "reported" && !reportedPosts.length ? (
        <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">No reported posts on your account.</p>
      ) : null}
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePosts.map((post) => (
          <IconPostItem
            key={post.id}
            post={post}
            selected={selectedId === String(post.id)}
            onSelect={() => setSelectedId((current) => (current === String(post.id) ? "" : String(post.id)))}
          />
        ))}
      </div>
      </div>
      <div className="mt-4">
        <PostDetailPanel
          post={visiblePosts.find((post) => String(post.id) === String(selectedId))}
          canDelete={true}
          onDelete={deletePost}
        />
      </div>
    </div>
  );
};

const AdminDashboardPage = ({ token }) => {
  const [mode, setMode] = useState("admin");
  const [adminPosts, setAdminPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportedPostsCount, setReportedPostsCount] = useState(0);
  const [selectedAdminPostId, setSelectedAdminPostId] = useState("");
  const [error, setError] = useState("");

  const loadAdminPosts = async () => {
    try {
      const data = await apiJson({ path: "/api/admin/shares?ownerRole=admin", token });
      const items = data.items || [];
      setAdminPosts(items);
      if (!items.length) {
        setSelectedAdminPostId("");
      } else if (!items.some((item) => String(item.id) === String(selectedAdminPostId))) {
        setSelectedAdminPostId("");
      }
    } catch (err) {
      setError(err.message || "Unable to load admin posts");
    }
  };

  const loadUsers = async () => {
    try {
      const data = await apiJson({ path: "/api/admin/users?role=user", token });
      setUsers(data.items || []);
    } catch (err) {
      setError(err.message || "Unable to load users");
    }
  };

  const loadReportedPostsCount = async () => {
    try {
      const data = await apiJson({ path: "/api/admin/reported", token });
      setReportedPostsCount((data.items || []).length);
    } catch (err) {
      setError(err.message || "Unable to load reported post count");
    }
  };

  useEffect(() => {
    loadAdminPosts();
    loadUsers();
    loadReportedPostsCount();
  }, [mode]);

  const deletePost = async (id) => {
    try {
      await apiJson({ path: `/api/shares/id/${id}`, method: "DELETE", token });
      await loadAdminPosts();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const userTotalAccess = users.reduce((sum, user) => sum + Number(user.totalViews || 0), 0);
  const topAccessUsers = [...users].sort((a, b) => Number(b.totalViews || 0) - Number(a.totalViews || 0));
  const cardClass = (active) =>
    `${statCardClass} text-left transition ${active ? "ring-2 ring-sky-300/80" : "hover:ring-2 hover:ring-sky-300/40"}`;

  return (
    <div className={appPanel}>
      <div className="mb-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-blue-50 to-sky-50 p-4">
        <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
        <p className="mt-1 text-sm text-slate-700">Review admin posts or jump into any user account activity.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button className={cardClass(mode === "admin")} onClick={() => setMode("admin")} type="button">
          <p className="text-xs uppercase tracking-wide text-sky-200">Admin Posts</p>
          <p className="mt-1 text-2xl font-bold">{adminPosts.length}</p>
        </button>
        <button className={cardClass(mode === "users")} onClick={() => setMode("users")} type="button">
          <p className="text-xs uppercase tracking-wide text-sky-200">Users</p>
          <p className="mt-1 text-2xl font-bold">{users.length}</p>
        </button>
        <button className={cardClass(mode === "access")} onClick={() => setMode("access")} type="button">
          <p className="text-xs uppercase tracking-wide text-sky-200">User Access</p>
          <p className="mt-1 text-2xl font-bold">{userTotalAccess}</p>
        </button>
        <button className={cardClass(false)} onClick={() => (window.location.href = "/admin/reported")} type="button">
          <p className="text-xs uppercase tracking-wide text-sky-200">Reported Posts</p>
          <p className="mt-1 text-2xl font-bold">{reportedPostsCount}</p>
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 flex flex-row items-center gap-3">
        <button
          className={`rounded-xl px-4 py-2 text-left text-sm font-semibold ${mode === "admin" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => setMode("admin")}
        >
          Admin Post
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-left text-sm font-semibold ${mode === "users" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => setMode("users")}
        >
          Users
        </button>
        <button
          className={`rounded-xl px-4 py-2 text-left text-sm font-semibold ${mode === "access" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          onClick={() => setMode("access")}
        >
          User Access
        </button>
      </div>

      {mode === "admin" ? (
        <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50/90 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Admin Posts</p>
          {!adminPosts.length ? <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">No admin posts found.</p> : null}
          <div className="flex flex-col gap-3">
            {adminPosts.map((post) => (
              <IconPostItem
                key={post.id}
                post={post}
                selected={selectedAdminPostId === String(post.id)}
                onSelect={() => setSelectedAdminPostId((current) => (current === String(post.id) ? "" : String(post.id)))}
              />
            ))}
          </div>
          <div className="mt-3">
            <PostDetailPanel
              post={adminPosts.find((post) => String(post.id) === String(selectedAdminPostId))}
              canDelete={true}
              onDelete={deletePost}
            />
          </div>
        </div>
      ) : null}

      {mode === "users" ? (
        <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50/90 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Users</p>
          {!users.length ? <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">No users found.</p> : null}
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <a
                key={user.id}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700"
                href={`/admin/users/${user.id}`}
              >
                <p className="font-semibold">{user.name}</p>
                <p className="text-sm text-slate-700">{user.email}</p>
                <p className="text-sm text-slate-700">
                  {user.shareCount} posts | {user.totalViews} access
                </p>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "access" ? (
        <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50/90 p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">User Access Tracking</p>
          {!topAccessUsers.length ? <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">No users found.</p> : null}
          <div className="flex flex-col gap-2">
            {topAccessUsers.map((user) => (
              <div key={user.id} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold">{user.name}</p>
                <p>{user.email}</p>
                <p>
                  Total access: {user.totalViews} | Posts: {user.shareCount}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const AdminUserDashboardPage = ({ token, userId }) => {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [sharesData, usersData] = await Promise.all([
        apiJson({ path: `/api/admin/users/${userId}/shares`, token }),
        apiJson({ path: "/api/admin/users", token })
      ]);
      const items = sharesData.items || [];
      setPosts(items);
      if (!items.length) {
        setSelectedPostId("");
      } else if (!items.some((item) => String(item.id) === String(selectedPostId))) {
        setSelectedPostId("");
      }
      setUsers(usersData.items || []);
    } catch (err) {
      setError(err.message || "Unable to load user dashboard");
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  const deletePost = async (id) => {
    try {
      await apiJson({ path: `/api/shares/id/${id}`, method: "DELETE", token });
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  const selectedUser = users.find((user) => String(user.id) === String(userId));

  return (
    <div className={appPanel}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">User Dashboard (Admin View)</h2>
          <p className="text-sm text-slate-700">
            {selectedUser ? `${selectedUser.name} - ${selectedUser.email}` : "Loading user..."}
          </p>
        </div>
        <a className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700" href="/admin">
          Back to Admin
        </a>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <IconPostItem
            key={post.id}
            post={post}
            selected={selectedPostId === String(post.id)}
            onSelect={() => setSelectedPostId((current) => (current === String(post.id) ? "" : String(post.id)))}
          />
        ))}
      </div>
      <div className="mt-3">
        <PostDetailPanel post={posts.find((post) => String(post.id) === String(selectedPostId))} canDelete={true} onDelete={deletePost} />
      </div>
    </div>
  );
};

const ReportPage = ({ token }) => {
  const [postToken, setPostToken] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (!postToken.trim()) throw new Error("Post token is required.");
      if (!tokenRegex.test(postToken.trim())) throw new Error("Token must be a 32-character hex value.");
      if (reason.trim().length > 300) throw new Error("Reason must be 300 characters or less.");
      await apiJson({
        path: `/api/shares/${postToken.trim()}/report`,
        method: "POST",
        token,
        body: { reason }
      });
      setMessage("Report submitted successfully.");
      setReason("");
    } catch (err) {
      setError(err.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={appPanel}>
      <h2 className="text-2xl font-semibold text-slate-900">Report</h2>
      <p className="mt-1 text-sm text-slate-700">Enter the post token and submit your report.</p>
      <form className="mt-4 grid gap-3" onSubmit={submit}>
        <input className={inputClass} placeholder="Post token" value={postToken} onChange={(e) => setPostToken(e.target.value)} />
        <textarea className={`${inputClass} min-h-28`} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {message ? <p className="text-sm text-sky-700">{message}</p> : null}
        <button className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  );
};

const ReportedPostsPage = ({ token }) => {
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiJson({ path: "/api/admin/reported", token });
      const items = data.items || [];
      setPosts(items);
      if (!items.length) {
        setSelectedPostId("");
      } else if (!items.some((item) => String(item.id) === String(selectedPostId))) {
        setSelectedPostId("");
      }
    } catch (err) {
      setError(err.message || "Unable to load reported posts");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deletePost = async (id) => {
    try {
      await apiJson({ path: `/api/shares/id/${id}`, method: "DELETE", token });
      if (String(selectedPostId) === String(id)) setSelectedPostId("");
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className={appPanel}>
      <h2 className="text-2xl font-semibold text-slate-900">Reported Posts</h2>
      <p className="mt-1 text-sm text-slate-700">Sorted by highest reports first.</p>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 flex flex-col gap-3">
        {posts.map((post) => (
          <IconPostItem
            key={post.id}
            post={post}
            selected={selectedPostId === String(post.id)}
            onSelect={() => setSelectedPostId((current) => (current === String(post.id) ? "" : String(post.id)))}
          />
        ))}
      </div>
      <div className="mt-3">
        <PostDetailPanel post={posts.find((post) => String(post.id) === String(selectedPostId))} canDelete={true} onDelete={deletePost} />
      </div>
    </div>
  );
};

const RetrieveView = ({ token }) => {
  const [payload, setPayload] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const autoLoadedTokenRef = useRef("");

  const loadPayload = async (providedPassword = "") => {
    setPayload(null);
    try {
      const headers = {};
      if (providedPassword.trim()) headers["x-access-password"] = providedPassword.trim();
      const response = await fetch(`${API_BASE_URL}/api/shares/${token}`, { headers });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 && data.passwordRequired) {
          setPasswordRequired(true);
          setError("");
          setPayload(null);
          return;
        }
        setPayload(null);
        throw new Error(data.error || "Unable to retrieve link");
      }
      setPasswordRequired(false);
      setError("");
      setPayload(data);
    } catch (err) {
      setError(err.message || "Unable to retrieve link");
    }
  };

  useEffect(() => {
    if (autoLoadedTokenRef.current === token) return;
    autoLoadedTokenRef.current = token;
    setPayload(null);
    setPassword("");
    setPasswordRequired(false);
    setError("");
    loadPayload("");
  }, [token]);

  const download = async () => {
    setError("");
    try {
      const headers = {};
      if (password.trim()) headers["x-access-password"] = password.trim();
      const response = await fetch(`${API_BASE_URL}/api/shares/${token}/download`, { headers });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Download failed");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = payload?.file?.originalName || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err.message || "Download failed");
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(payload?.text || "");
      setCopyMessage("Copied to clipboard.");
      setTimeout(() => setCopyMessage(""), 2000);
    } catch (_error) {
      setCopyMessage("Failed to copy.");
      setTimeout(() => setCopyMessage(""), 2000);
    }
  };

  return (
    <div className="vault-page min-h-screen">
      <div className="vault-orb orb-a" />
      <div className="vault-orb orb-b" />
      <div className="mx-auto max-w-3xl px-4 py-10">
      <div className={`${appPanel} relative z-10`}>
        <h1 className="text-3xl font-bold text-slate-900">Retrieve Link</h1>
        <p className="mt-1 text-sm text-slate-700">Post Token: {token}</p>
        {passwordRequired ? (
          <div className="mt-4 grid gap-3">
            <input className={inputClass} type="password" placeholder="Password required" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn-glow rounded-xl bg-sky-700 px-4 py-3 font-semibold text-white" onClick={() => loadPayload(password)}>
              Open Link
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {payload?.type === "text" ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{payload.text}</pre>
            <button className="btn-glow mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700" onClick={copyText}>
              Copy Text
            </button>
            {copyMessage ? <p className="mt-2 text-sm text-slate-700">{copyMessage}</p> : null}
          </div>
        ) : null}
        {payload?.type === "file" ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <p>{payload.file?.originalName}</p>
            <button className="btn-glow mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700" onClick={download}>
              Download
            </button>
          </div>
        ) : null}
        <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          If you want to report, please login and report from Report page.
        </div>
      </div>
    </div>
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState(authFromStorage);
  const pathname = window.location.pathname;
  const shareMatch = pathname.match(/^\/share\/([a-f0-9]{32})$/i);
  const adminUserMatch = pathname.match(/^\/admin\/users\/([^/]+)$/i);

  useEffect(() => {
    const syncAuth = async () => {
      if (!auth.token) return;
      try {
        const data = await apiJson({ path: "/api/auth/me", token: auth.token });
        const nextAuth = { token: auth.token, user: data.user };
        setAuth(nextAuth);
        persistAuth(nextAuth);
      } catch (_error) {
        setAuth({ token: "", user: null });
        clearAuth();
      }
    };
    syncAuth();
  }, []);

  const handleAuth = (data) => {
    const nextAuth = { token: data.token, user: data.user };
    setAuth(nextAuth);
    persistAuth(nextAuth);
  };

  const logout = () => {
    setAuth({ token: "", user: null });
    clearAuth();
    window.location.href = "/";
  };

  if (shareMatch) return <RetrieveView token={shareMatch[1]} />;
  if (!auth.token || !auth.user) return <AuthScreen onAuth={handleAuth} />;

  const isAdmin = auth.user.role === "admin";

  if (pathname === "/upload") {
    return (
      <AppShell auth={auth} onLogout={logout} pathname={pathname}>
        <CreateSharePage token={auth.token} />
      </AppShell>
    );
  }

  if (!isAdmin && (pathname === "/" || pathname === "/dashboard")) {
    return (
      <AppShell auth={auth} onLogout={logout} pathname={pathname}>
        <UserDashboardPage token={auth.token} />
      </AppShell>
    );
  }

  if (!isAdmin && pathname === "/report") {
    return (
      <AppShell auth={auth} onLogout={logout} pathname={pathname}>
        <ReportPage token={auth.token} />
      </AppShell>
    );
  }

  if (isAdmin && (pathname === "/" || pathname === "/dashboard" || pathname === "/admin")) {
    return (
      <AppShell auth={auth} onLogout={logout} pathname={pathname}>
        <AdminDashboardPage token={auth.token} />
      </AppShell>
    );
  }

  if (isAdmin && adminUserMatch) {
    return (
      <AppShell auth={auth} onLogout={logout} pathname={pathname}>
        <AdminUserDashboardPage token={auth.token} userId={adminUserMatch[1]} />
      </AppShell>
    );
  }

  if (isAdmin && pathname === "/admin/reported") {
    return (
      <AppShell auth={auth} onLogout={logout} pathname={pathname}>
        <ReportedPostsPage token={auth.token} />
      </AppShell>
    );
  }

  return (
    <AppShell auth={auth} onLogout={logout} pathname={pathname}>
      {isAdmin ? <AdminDashboardPage token={auth.token} /> : <UserDashboardPage token={auth.token} />}
    </AppShell>
  );
}












