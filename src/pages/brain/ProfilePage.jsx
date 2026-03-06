import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  User, Mail, Lock, Eye, EyeOff, Copy, Check, Wifi, WifiOff,
  Terminal, Bot, Globe, Save, AlertCircle, Loader2, Key,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, brainApi, getAccessToken } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/40 bg-muted/10">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, type = "text", placeholder, disabled, suffix }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 focus-within:border-violet-500/50 transition-colors">
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 text-sm bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
      />
      {suffix}
    </div>
  );
}

function StatusRow({ icon: Icon, color, label, value, loading }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0", color.bg)}>
        <Icon className={cn("h-4 w-4", color.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {loading ? "Loading…" : value}
        </p>
      </div>
    </div>
  );
}

// ─── hooks ────────────────────────────────────────────────────────────────────
function useLastSync() {
  return useQuery({
    queryKey:  ["devbrain-last-sync"],
    queryFn:   () => brainApi.profileSync().then((r) => r.data?.data ?? r.data),
    staleTime: 60_000,
    retry:     false,
  });
}

// ─── Account Info Section ─────────────────────────────────────────────────────
function AccountSection({ user, onUpdate }) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [email,    setEmail]    = useState(user?.email ?? "");
  const [saved,    setSaved]    = useState(false);

  const mutation = useMutation({
    mutationFn: (body) => authApi.updateProfile(body),
    onSuccess: (res) => {
      const updated = res.data?.data?.user ?? res.data?.data;
      if (updated) onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    mutation.mutate({ username: username.trim(), email: email.trim() });
  };

  return (
    <SectionCard title="Account Info">
      <form onSubmit={handleSave} className="space-y-4">
        <Field label="Username">
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        </Field>
        <Field label="Email">
          <TextInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" />
        </Field>
        <Field label="Member Since">
          <p className="text-sm text-muted-foreground">
            {user?.createdAt ? format(new Date(user.createdAt), "MMMM d, yyyy") : "—"}
          </p>
        </Field>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3 w-3" /> Saved
            </span>
          )}
          {mutation.isError && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              {mutation.error?.response?.data?.message ?? "Failed to save"}
            </span>
          )}
        </div>
      </form>
    </SectionCard>
  );
}

// ─── Change Password Section ──────────────────────────────────────────────────
function PasswordSection() {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [err,      setErr]      = useState("");

  const mutation = useMutation({
    mutationFn: (body) => authApi.changePassword(body),
    onSuccess: () => {
      setCurrent(""); setNext(""); setConfirm("");
      setSaved(true);
      setErr("");
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setErr(e?.response?.data?.message ?? "Failed to change password"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");
    if (!current || !next || !confirm) { setErr("All fields are required"); return; }
    if (next.length < 8)               { setErr("Password must be at least 8 characters"); return; }
    if (next !== confirm)              { setErr("Passwords do not match"); return; }
    mutation.mutate({ currentPassword: current, newPassword: next });
  };

  const PwInput = ({ value, onChange, placeholder }) => (
    <TextInput
      type={show ? "text" : "password"}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      suffix={
        <button type="button" onClick={() => setShow(!show)} className="text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      }
    />
  );

  return (
    <SectionCard title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Current Password">
          <PwInput value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" />
        </Field>
        <Field label="New Password">
          <PwInput value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (min 8 chars)" />
        </Field>
        <Field label="Confirm New Password">
          <PwInput value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" />
        </Field>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
            Update Password
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="h-3 w-3" /> Password updated
            </span>
          )}
        </div>
        {err && (
          <p className="flex items-center gap-1.5 text-xs text-red-400 mt-1">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />{err}
          </p>
        )}
      </form>
    </SectionCard>
  );
}

// ─── Token Section ─────────────────────────────────────────────────────────────
function TokenSection() {
  const [copied, setCopied]   = useState(false);
  const [visible, setVisible] = useState(false);

  const token = getAccessToken() ?? "";

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const masked = token ? token.slice(0, 8) + "•".repeat(Math.max(0, token.length - 16)) + token.slice(-8) : "—";

  return (
    <SectionCard title="API Token">
      <p className="text-xs text-muted-foreground leading-relaxed">
        This JWT is used by the browser extension and CLI plugin to authenticate events.
        Keep it secret — paste it into the extension and plugin settings.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
        <Key className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <code className="flex-1 text-xs font-mono text-foreground truncate">
          {visible ? token : masked}
        </code>
        <button onClick={() => setVisible(!visible)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Connection Status Section ────────────────────────────────────────────────
function ConnectionSection() {
  const { data, isLoading } = useLastSync();

  const fmt = (ts) => ts ? format(new Date(ts), "MMM d, yyyy HH:mm") : "Never";

  const extSync  = data?.extensionLastSync  ?? data?.lastExtSync ?? null;
  const plugSync = data?.pluginLastSync     ?? data?.lastPluginSync ?? null;
  const connected = !!extSync || !!plugSync;

  return (
    <SectionCard title="DevBrain Connection">
      <div className="flex items-center gap-2 mb-2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : connected ? (
          <Wifi className="h-4 w-4 text-emerald-400" />
        ) : (
          <WifiOff className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={cn("text-sm font-medium", connected ? "text-emerald-400" : "text-muted-foreground")}>
          {isLoading ? "Checking…" : connected ? "Connected" : "No events received yet"}
        </span>
      </div>

      <div className="space-y-3">
        <StatusRow
          icon={Globe}
          color={{ bg: "bg-blue-500/10", text: "text-blue-400" }}
          label="Extension Last Sync"
          value={fmt(extSync)}
          loading={isLoading}
        />
        <StatusRow
          icon={Terminal}
          color={{ bg: "bg-zinc-500/10", text: "text-zinc-400" }}
          label="CLI Plugin Last Sync"
          value={fmt(plugSync)}
          loading={isLoading}
        />
        <StatusRow
          icon={Bot}
          color={{ bg: "bg-violet-500/10", text: "text-violet-400" }}
          label="AI Conversations Today"
          value={isLoading ? "…" : (data?.aiPromptsToday ?? 0) + " prompts"}
          loading={isLoading}
        />
      </div>

      {/* Setup instructions */}
      <div className="mt-4 rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">Setup Instructions</p>
        <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
          <li>Copy your API token above.</li>
          <li>
            <strong className="text-foreground">Chrome extension:</strong>{" "}
            Open the extension popup → Settings → paste token + set endpoint to{" "}
            <code className="text-violet-300 bg-violet-500/10 px-1 rounded">http://localhost:8080/api/events</code>
          </li>
          <li>
            <strong className="text-foreground">CLI Plugin:</strong>{" "}
            Run <code className="text-violet-300 bg-violet-500/10 px-1 rounded">devbrain config --token &lt;token&gt;</code>{" "}
            or set env var <code className="text-violet-300 bg-violet-500/10 px-1 rounded">DEVBRAIN_TOKEN</code>
          </li>
          <li>Events will appear in your dashboard within seconds of activity.</li>
        </ol>
      </div>
    </SectionCard>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();

  // Optimistically update user in context via local storage sync
  const handleUserUpdate = (updated) => {
    // Persist updated user info so the sidebar picks it up on next render
    const key = "dn_user";
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      localStorage.setItem(key, JSON.stringify({ ...stored, ...updated }));
    } catch { /* ignore */ }
    queryClient.invalidateQueries(["devbrain-last-sync"]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-violet-400" />
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and DevBrain connection settings</p>
      </div>

      {/* Avatar + quick info */}
      <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/20 border border-violet-500/30 text-2xl font-bold text-violet-300 flex-shrink-0">
          {(user?.username?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{user?.username ?? "—"}</p>
          <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            {user?.email ?? "—"}
          </p>
        </div>
      </div>

      <AccountSection   user={user} onUpdate={handleUserUpdate} />
      <PasswordSection  />
      <TokenSection     />
      <ConnectionSection />
    </div>
  );
}
