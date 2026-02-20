import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Copy, Check, LogOut, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const token = getAccessToken();

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success("Token copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Account and token management</p>
      </div>

      {/* Account Info */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Account Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm text-foreground">{user?.name || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm text-foreground font-mono">{user?.email || "—"}</span>
          </div>
        </div>
      </div>

      {/* Token */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Access Token</h2>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-secondary px-3 py-2 text-xs font-mono text-muted-foreground truncate">
            {token ? `${token.slice(0, 20)}...${token.slice(-10)}` : "No active token"}
          </code>
          <Button variant="outline" size="sm" onClick={copyToken} disabled={!token} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-4">
        <h2 className="text-sm font-medium text-destructive">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Sign out</p>
            <p className="text-xs text-muted-foreground">End your current session</p>
          </div>
          <Button variant="destructive" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
