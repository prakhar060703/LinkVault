import { useMemo, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const cardClass = "rounded-2xl border border-black/10 bg-white p-6 shadow-lg";

const toLocalInputValue = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const UploadView = () => {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [oneTimeView, setOneTimeView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const suggestedExpiry = useMemo(() => {
    const dt = new Date();
    dt.setMinutes(dt.getMinutes() + 30);
    return toLocalInputValue(dt);
  }, []);

  const resetInputMode = (mode) => {
    if (mode === "text") setFile(null);
    if (mode === "file") setText("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const hasText = text.trim().length > 0;
    const hasFile = Boolean(file);
    if ((hasText && hasFile) || (!hasText && !hasFile)) {
      setError("Provide either text or a file.");
      return;
    }

    const formData = new FormData();
    if (hasText) formData.append("text", text.trim());
    if (hasFile) formData.append("file", file);
    if (expiresAt) formData.append("expiresAt", new Date(expiresAt).toISOString());
    if (password.trim()) formData.append("password", password.trim());
    formData.append("oneTimeView", String(oneTimeView));

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shares`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      const appShareUrl = `${window.location.origin}/share/${data.token}`;
      setResult({ ...data, appShareUrl });
    } catch (uploadError) {
      setError(uploadError.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-ink">LinkVault</h1>
        <p className="mt-2 text-muted">Secure text/file sharing with expiring secret links.</p>
      </div>

      <form className={cardClass} onSubmit={onSubmit}>
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="font-medium">Text payload</span>
            <textarea
              className="min-h-40 rounded-xl border border-black/15 px-3 py-2"
              placeholder="Paste text content here"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) resetInputMode("text");
              }}
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">File payload</span>
            <input
              className="rounded-xl border border-black/15 px-3 py-2"
              type="file"
              onChange={(e) => {
                const chosen = e.target.files?.[0] || null;
                setFile(chosen);
                if (chosen) resetInputMode("file");
              }}
            />
          </label>

          <label className="grid gap-2">
            <span className="font-medium">Expiry (optional)</span>
            <input
              className="rounded-xl border border-black/15 px-3 py-2"
              type="datetime-local"
              value={expiresAt}
              placeholder={suggestedExpiry}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <span className="text-sm text-muted">Default expiry is 30 minutes if left empty.</span>
          </label>

          <label className="grid gap-2">
            <span className="font-medium">Password protection (bonus)</span>
            <input
              className="rounded-xl border border-black/15 px-3 py-2"
              type="password"
              placeholder="Optional"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={oneTimeView} onChange={(e) => setOneTimeView(e.target.checked)} />
            <span>One-time view link (bonus)</span>
          </label>

          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

          <button
            className="rounded-xl bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Create secure link"}
          </button>
        </div>
      </form>

      {result ? (
        <div className={`${cardClass} mt-6`}>
          <h2 className="text-xl font-semibold">Share created</h2>
          <p className="mt-2 text-sm text-muted">Open this frontend link to retrieve content:</p>
          <a className="mt-2 block break-all font-medium text-accent" href={result.appShareUrl}>
            {result.appShareUrl}
          </a>
          <p className="mt-4 text-sm text-muted">Direct backend API link:</p>
          <code className="mt-1 block break-all rounded-lg bg-black/5 p-2 text-sm">{result.shareUrl}</code>
          <p className="mt-3 text-sm">Expires at: {new Date(result.expiresAt).toLocaleString()}</p>
        </div>
      ) : null}
    </div>
  );
};

const RetrieveView = ({ token }) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const fetchPayload = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = {};
      if (password.trim()) headers["x-access-password"] = password.trim();

      const response = await fetch(`${API_BASE_URL}/api/shares/${token}`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load link");
      setPayload(data);
    } catch (err) {
      setPayload(null);
      setError(err.message || "Failed to load link");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
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
      const fileName = payload?.file?.originalName || "download";
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err.message || "Download failed");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className={cardClass}>
        <h1 className="text-3xl font-bold text-ink">Retrieve secret content</h1>
        <p className="mt-2 text-sm text-muted">Token: {token}</p>

        <div className="mt-4 grid gap-3">
          <input
            className="rounded-xl border border-black/15 px-3 py-2"
            type="password"
            placeholder="Password (only if sender set one)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="rounded-xl bg-ink px-4 py-3 font-semibold text-white disabled:opacity-60"
            type="button"
            onClick={fetchPayload}
            disabled={loading}
          >
            {loading ? "Checking..." : "Open link"}
          </button>
          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        </div>

        {payload?.type === "text" ? (
          <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.03] p-4">
            <h2 className="text-lg font-semibold">Shared text</h2>
            <pre className="mt-3 whitespace-pre-wrap text-sm">{payload.text}</pre>
            <button
              className="mt-4 rounded-lg border border-black/15 px-3 py-2 text-sm"
              type="button"
              onClick={() => navigator.clipboard.writeText(payload.text || "")}
            >
              Copy text
            </button>
          </div>
        ) : null}

        {payload?.type === "file" ? (
          <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.03] p-4">
            <h2 className="text-lg font-semibold">Shared file</h2>
            <p className="mt-2 text-sm">Name: {payload.file?.originalName}</p>
            <p className="text-sm text-muted">Size: {payload.file?.size} bytes</p>
            <button className="mt-4 rounded-lg border border-black/15 px-3 py-2 text-sm" type="button" onClick={downloadFile}>
              Download
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default function App() {
  const match = window.location.pathname.match(/^\/share\/([a-f0-9]{32})$/i);
  if (match) {
    return <RetrieveView token={match[1]} />;
  }
  return <UploadView />;
}
