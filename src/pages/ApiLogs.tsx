import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function ApiLogsPage() {
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["logs", page],
    queryFn: () => analyticsApi.logs({ page, limit: 20 }).then((r) => r.data),
    retry: false,
  });

  const logs = data?.items || data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">API Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Request and response log history</p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="w-8 px-3 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Endpoint</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Latency</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No logs found.</td></tr>
            ) : (
              logs.map((log: any, i: number) => (
                <>
                  <tr
                    key={i}
                    className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <td className="px-3 py-3 text-muted-foreground">
                      {expandedRow === i ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                        log.method === "POST" ? "bg-primary/10 text-primary"
                        : log.method === "DELETE" ? "bg-destructive/10 text-destructive"
                        : "bg-info/10 text-info"
                      }`}>
                        {log.method || "GET"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{log.endpoint || log.path}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono ${(log.status || 200) < 400 ? "text-success" : "text-destructive"}`}>
                        {log.status || 200}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{log.latency || 0}ms</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}</td>
                  </tr>
                  {expandedRow === i && (
                    <tr key={`${i}-detail`}>
                      <td colSpan={6} className="bg-secondary/20 px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Request</p>
                            <pre className="rounded bg-secondary p-3 text-xs font-mono text-foreground overflow-auto max-h-48">
                              {JSON.stringify(log.request || {}, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Response</p>
                            <pre className="rounded bg-secondary p-3 text-xs font-mono text-foreground overflow-auto max-h-48">
                              {JSON.stringify(log.response || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-secondary disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
