import { useEffect, useMemo, useRef, useState } from "react";

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

const appPanel = "rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-300/30";
const inputClass =
  "rounded-xl border border-slate-400 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-600 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

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
    <div className="mx-auto min-h-screen max-w-xl px-4 py-14">
      <div className={appPanel}>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">LinkVault</h1>
        <p className="mt-2 text-sm text-slate-700">Secure share platform for text and files.</p>
        <div className="mt-6 flex rounded-xl border border-slate-300 p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "login" ? "bg-slate-900 text-white" : "text-slate-800"}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "register" ? "bg-slate-900 text-white" : "text-slate-800"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <form className="mt-5 grid gap-3" onSubmit={submit}>
          {mode === "register" ? (
            <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          ) : null}
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button className="rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
};

const AppShell = ({ auth, onLogout, children }) => {
  const isAdmin = auth.user?.role === "admin";
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">LinkVault</h1>
          <p className="text-sm text-slate-700">
            {auth.user?.name} ({auth.user?.role})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/upload">
            Upload
          </a>
          {!isAdmin ? (
            <>
              <a className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/dashboard">
                Dashboard
              </a>
              <a className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/report">
                Report
              </a>
            </>
          ) : (
            <>
              <a className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/admin">
                Admin Dashboard
              </a>
              <a className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" href="/admin/reported">
                Reported Posts
              </a>
            </>
          )}
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      {children}
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
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } catch (err) {
      setError(err.message || "Unable to create link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form className={appPanel} onSubmit={submit}>
        <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
          <h2 className="text-3xl font-semibold">Upload</h2>
          <p className="mt-1 text-sm text-slate-100">Choose content type and generate a secure share link instantly.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
          className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating..." : "Generate Link"}
        </button>
      </form>

      <section id="generated-link" ref={resultRef} className={appPanel}>
        <h3 className="text-xl font-semibold text-slate-900">Generated Link</h3>
        {result ? (
          <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <a className="block break-all text-base font-semibold text-orange-700" href={result.appShareUrl} target="_blank" rel="noreferrer">
              {result.appShareUrl}
            </a>
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

const IconPostItem = ({ post, expanded, onToggle, canDelete, onDelete }) => {
  const link = `${window.location.origin}/share/${post.token}`;
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-3">
      <button className="flex w-full items-center gap-3 text-left" onClick={onToggle}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lg font-semibold text-white">
          {post.type === "text" ? "T" : "F"}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{post.type === "text" ? "Text Post" : "File Post"}</p>
          <p className="text-sm text-slate-700">Token: {post.token.slice(0, 12)}...</p>
        </div>
      </button>

      {expanded ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-sm text-slate-800">{countLabel(post)}</p>
          <p className="mt-1 text-sm text-slate-700">Post Token: {post.token}</p>
          <a className="mt-1 block break-all text-sm font-medium text-orange-600" href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
          <p className="mt-1 text-sm text-slate-700">Created: {new Date(post.createdAt).toLocaleString()}</p>
          {post.type === "text" ? (
            <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">{post.text || ""}</pre>
          ) : (
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
              <p>Name: {post.file?.originalName || "-"}</p>
              <p>Type: {post.file?.mimeType || "-"}</p>
              <p>Size: {post.file?.size || 0} bytes</p>
            </div>
          )}
          {canDelete ? (
            <button className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700" onClick={() => onDelete(post.id)}>
              Delete Post
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const UserDashboardPage = ({ token }) => {
  const [posts, setPosts] = useState([]);
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiJson({ path: "/api/shares/mine", token });
      setPosts(data.items || []);
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
      if (expandedId === id) setExpandedId("");
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className={appPanel}>
      <h2 className="text-2xl font-semibold text-slate-900">User Dashboard</h2>
      <p className="mt-1 text-sm text-slate-700">Icon view: click icon to expand details.</p>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <IconPostItem
            key={post.id}
            post={post}
            expanded={expandedId === String(post.id)}
            onToggle={() => setExpandedId((current) => (current === String(post.id) ? "" : String(post.id)))}
            canDelete={true}
            onDelete={deletePost}
          />
        ))}
      </div>
    </div>
  );
};

const AdminDashboardPage = ({ token }) => {
  const [mode, setMode] = useState("admin");
  const [adminPosts, setAdminPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");

  const loadAdminPosts = async () => {
    try {
      const data = await apiJson({ path: "/api/admin/shares?ownerRole=admin", token });
      setAdminPosts(data.items || []);
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

  useEffect(() => {
    if (mode === "admin") loadAdminPosts();
    if (mode === "users") loadUsers();
  }, [mode]);

  const deletePost = async (id) => {
    try {
      await apiJson({ path: `/api/shares/id/${id}`, method: "DELETE", token });
      await loadAdminPosts();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <div className={appPanel}>
      <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
      <p className="mt-1 text-sm text-slate-700">Vertical mode view.</p>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-4 flex flex-row items-center gap-2">
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
          User Post
        </button>
      </div>

      {mode === "admin" ? (
        <div className="mt-4 rounded-2xl border border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-800">Admin Posts</p>
          <div className="flex flex-col gap-3">
            {adminPosts.map((post) => (
              <IconPostItem
                key={post.id}
                post={post}
                expanded={expandedId === String(post.id)}
                onToggle={() => setExpandedId((current) => (current === String(post.id) ? "" : String(post.id)))}
                canDelete={true}
                onDelete={deletePost}
              />
            ))}
          </div>
        </div>
      ) : null}

      {mode === "users" ? (
        <div className="mt-4 rounded-2xl border border-slate-300 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-800">User Posts</p>
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
    </div>
  );
};

const AdminUserDashboardPage = ({ token, userId }) => {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [sharesData, usersData] = await Promise.all([
        apiJson({ path: `/api/admin/users/${userId}/shares`, token }),
        apiJson({ path: "/api/admin/users", token })
      ]);
      setPosts(sharesData.items || []);
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
            expanded={expandedId === String(post.id)}
            onToggle={() => setExpandedId((current) => (current === String(post.id) ? "" : String(post.id)))}
            canDelete={true}
            onDelete={deletePost}
          />
        ))}
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
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        <button className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60" disabled={loading}>
          {loading ? "Submitting..." : "Submit Report"}
        </button>
      </form>
    </div>
  );
};

const ReportedPostsPage = ({ token }) => {
  const [posts, setPosts] = useState([]);
  const [expandedId, setExpandedId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiJson({ path: "/api/admin/reported", token });
      setPosts(data.items || []);
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
      if (expandedId === id) setExpandedId("");
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
            expanded={expandedId === String(post.id)}
            onToggle={() => setExpandedId((current) => (current === String(post.id) ? "" : String(post.id)))}
            canDelete={true}
            onDelete={deletePost}
          />
        ))}
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
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <div className={appPanel}>
        <h1 className="text-3xl font-bold text-slate-900">Retrieve Link</h1>
        <p className="mt-1 text-sm text-slate-700">Post Token: {token}</p>
        {passwordRequired ? (
          <div className="mt-4 grid gap-3">
            <input className={inputClass} type="password" placeholder="Password required" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white" onClick={() => loadPayload(password)}>
              Open Link
            </button>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {payload?.type === "text" ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{payload.text}</pre>
            <button className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700" onClick={copyText}>
              Copy Text
            </button>
            {copyMessage ? <p className="mt-2 text-sm text-slate-700">{copyMessage}</p> : null}
          </div>
        ) : null}
        {payload?.type === "file" ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <p>{payload.file?.originalName}</p>
            <button className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium text-slate-700" onClick={download}>
              Download
            </button>
          </div>
        ) : null}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          If you want to report, please login and report from Report page.
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
      <AppShell auth={auth} onLogout={logout}>
        <CreateSharePage token={auth.token} />
      </AppShell>
    );
  }

  if (!isAdmin && (pathname === "/" || pathname === "/dashboard")) {
    return (
      <AppShell auth={auth} onLogout={logout}>
        <UserDashboardPage token={auth.token} />
      </AppShell>
    );
  }

  if (!isAdmin && pathname === "/report") {
    return (
      <AppShell auth={auth} onLogout={logout}>
        <ReportPage token={auth.token} />
      </AppShell>
    );
  }

  if (isAdmin && (pathname === "/" || pathname === "/dashboard" || pathname === "/admin")) {
    return (
      <AppShell auth={auth} onLogout={logout}>
        <AdminDashboardPage token={auth.token} />
      </AppShell>
    );
  }

  if (isAdmin && adminUserMatch) {
    return (
      <AppShell auth={auth} onLogout={logout}>
        <AdminUserDashboardPage token={auth.token} userId={adminUserMatch[1]} />
      </AppShell>
    );
  }

  if (isAdmin && pathname === "/admin/reported") {
    return (
      <AppShell auth={auth} onLogout={logout}>
        <ReportedPostsPage token={auth.token} />
      </AppShell>
    );
  }

  return (
    <AppShell auth={auth} onLogout={logout}>
      {isAdmin ? <AdminDashboardPage token={auth.token} /> : <UserDashboardPage token={auth.token} />}
    </AppShell>
  );
}
