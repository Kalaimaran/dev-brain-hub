import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { providerApi, dataApi } from "@/lib/api";
import { TrendingUp, ChevronDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Memory Graph"];

const TIME_RANGE_OPTIONS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const DONUT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: 11,
  color: "hsl(var(--foreground))",
};

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ label, value, trend, quota }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground tabular-nums font-mono">{value}</p>
      <div className="flex items-center justify-between">
        {trend && (
          <div className="flex items-center gap-1 text-xs text-success font-medium">
            <TrendingUp className="h-3.5 w-3.5" />
            {trend}
          </div>
        )}
        {quota && (
          <span className="ml-auto rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            {quota}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Force-directed Graph (embedding-based) ────────────────────── */
function ForceGraph({ edges, items }) {
  const svgRef = useRef(null);
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const dragRef = useRef(null);
  const [, forceUpdate] = useState(0);

  // Build graph data from similarity matrix edges
  const graphData = useMemo(() => {
    const nodeMap = {};
    const graphEdges = [];

    // Build nodes from edges
    edges.forEach((e) => {
      const sId = String(e.source_id);
      const tId = String(e.target_id);

      if (!nodeMap[sId]) {
        nodeMap[sId] = {
          id: sId,
          label: (e.source_input || "").slice(0, 35),
          intent: (e.source_intent || "").slice(0, 25),
          type: "question",
          x: 200 + Math.random() * 400,
          y: 80 + Math.random() * 280,
          vx: 0, vy: 0,
        };
      }
      if (!nodeMap[tId]) {
        nodeMap[tId] = {
          id: tId,
          label: (e.target_input || "").slice(0, 35),
          intent: (e.target_intent || "").slice(0, 25),
          type: "question",
          x: 200 + Math.random() * 400,
          y: 80 + Math.random() * 280,
          vx: 0, vy: 0,
        };
      }

      graphEdges.push({
        source: sId,
        target: tId,
        similarity: Number(e.similarity) || 0,
      });
    });

    // If no edges from similarity matrix but we have items, create standalone nodes
    if (edges.length === 0 && items.length > 0) {
      items.slice(0, 30).forEach((item, i) => {
        const id = String(item.id || i);
        if (!nodeMap[id]) {
          nodeMap[id] = {
            id,
            label: (item.input || "").slice(0, 35),
            intent: (item.intent || "").slice(0, 25),
            type: "question",
            x: 150 + Math.random() * 500,
            y: 60 + Math.random() * 300,
            vx: 0, vy: 0,
          };
        }
      });
    }

    return { nodes: Object.values(nodeMap), edges: graphEdges };
  }, [edges, items]);

  // Force simulation
  useEffect(() => {
    nodesRef.current = graphData.nodes.map((n) => ({ ...n }));
    edgesRef.current = graphData.edges;

    let tick = 0;
    const maxTicks = 200;

    const simulate = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;
      const alpha = Math.max(0.005, 1 - tick / maxTicks);

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          let dx = ns[j].x - ns[i].x;
          let dy = ns[j].y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (alpha * 1200) / (dist * dist);
          dx *= force; dy *= force;
          ns[i].vx -= dx; ns[i].vy -= dy;
          ns[j].vx += dx; ns[j].vy += dy;
        }
      }

      // Attraction on edges (stronger = more similar)
      es.forEach((e) => {
        const s = ns.find((n) => n.id === e.source);
        const t = ns.find((n) => n.id === e.target);
        if (!s || !t) return;
        const idealDist = 80 + (1 - e.similarity) * 200;
        let dx = t.x - s.x;
        let dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = alpha * (dist - idealDist) * 0.04;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        s.vx += dx; s.vy += dy;
        t.vx -= dx; t.vy -= dy;
      });

      // Center gravity
      ns.forEach((n) => {
        n.vx += (400 - n.x) * alpha * 0.008;
        n.vy += (220 - n.y) * alpha * 0.008;
        n.vx *= 0.75; n.vy *= 0.75;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(50, Math.min(750, n.x));
        n.y = Math.max(40, Math.min(400, n.y));
      });

      tick++;
      forceUpdate((v) => v + 1);
      if (tick < maxTicks) animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData]);

  // Drag
  const onPointerDown = useCallback((e, node) => {
    e.preventDefault();
    dragRef.current = { id: node.id, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y };
    const svg = svgRef.current;
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const n = nodesRef.current.find((nd) => nd.id === d.id);
      if (!n) return;
      n.x = d.ox + (ev.clientX - d.sx);
      n.y = d.oy + (ev.clientY - d.sy);
      n.vx = 0; n.vy = 0;
      forceUpdate((v) => v + 1);
    };
    const onUp = () => {
      dragRef.current = null;
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
    };
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
  }, []);

  const nodes = nodesRef.current;
  const gEdges = edgesRef.current;

  return (
    <svg ref={svgRef} viewBox="0 0 800 440" className="w-full h-full" style={{ touchAction: "none" }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--muted-foreground))" opacity="0.4" />
        </marker>
      </defs>
      {/* Edges with similarity labels */}
      {gEdges.map((e, i) => {
        const s = nodes.find((n) => n.id === e.source);
        const t = nodes.find((n) => n.id === e.target);
        if (!s || !t) return null;
        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        const opacity = 0.2 + e.similarity * 0.6;
        const width = 1 + e.similarity * 2;
        return (
          <g key={i}>
            <line
              x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="hsl(var(--primary))"
              strokeOpacity={opacity}
              strokeWidth={width}
            />
            <text x={midX} y={midY - 4} textAnchor="middle" fontSize={8}
              fill="hsl(var(--muted-foreground))" opacity={0.7}>
              {(e.similarity * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
      {/* Nodes */}
      {nodes.map((n) => (
        <g key={n.id} onPointerDown={(e) => onPointerDown(e, n)} style={{ cursor: "grab" }}>
          <circle
            cx={n.x} cy={n.y} r={16}
            fill="hsl(var(--primary) / 0.12)"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
          />
          <text x={n.x} y={n.y + 3} textAnchor="middle" fontSize={8} fontWeight={600}
            fill="hsl(var(--primary))" className="select-none pointer-events-none">
            Q
          </text>
          {/* Input label */}
          <text x={n.x} y={n.y + 28} textAnchor="middle" fontSize={8.5}
            fill="hsl(var(--foreground))" className="select-none pointer-events-none">
            {n.label}
          </text>
          {/* Intent label */}
          {n.intent && (
            <text x={n.x} y={n.y + 39} textAnchor="middle" fontSize={7.5}
              fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none">
              → {n.intent}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ── Dashboard Page ────────────────────────────────────────────── */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [selectedRange, setSelectedRange] = useState(TIME_RANGE_OPTIONS[2]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  const days = selectedRange.days;

  const { data: summary } = useQuery({
    queryKey: ["provider-summary", days],
    queryFn: () => providerApi.summary(days).then((r) => r.data?.data ?? r.data),
    retry: false,
  });

  const { data: daily } = useQuery({
    queryKey: ["provider-daily", days],
    queryFn: () => providerApi.daily(days).then((r) => r.data?.data ?? r.data),
    retry: false,
  });

  const { data: byType } = useQuery({
    queryKey: ["provider-by-type", days],
    queryFn: () => providerApi.byType(days).then((r) => r.data?.data ?? r.data),
    retry: false,
  });

  const { data: dataList } = useQuery({
    queryKey: ["data-list"],
    queryFn: () => dataApi.list({ limit: 50 }).then((r) => r.data?.data ?? r.data),
    retry: false,
  });

  const { data: simMatrix } = useQuery({
    queryKey: ["similarity-matrix"],
    queryFn: () => providerApi.similarityMatrix(30).then((r) => r.data?.data ?? r.data),
    retry: false,
    enabled: activeTab === "Memory Graph",
  });

  const stats = summary || {};
  const tokens = stats.totalTokens || 0;
  const searches = stats.totalSearches || 0;
  const embeds = stats.totalEmbeds || 0;
  const avgLatency = stats.avgLatencyMs || 0;

  const items = dataList?.items || dataList || [];
  const dailyData = daily || [];
  const typeData = byType || [];
  const similarityEdges = simMatrix || [];

  // Donut data from API type breakdown
  const donutData = typeData.length > 0
    ? typeData.map((t) => ({ name: t.apiType, value: t.count }))
    : [
      { name: "EMBED", value: Math.max(embeds, 1) },
      { name: "SEARCH", value: Math.max(searches, 1) },
    ];

  // Token usage per type from byType (embed tokens vs search tokens)
  const tokenByType = useMemo(() => {
    if (typeData.length === 0) return [];
    return typeData.map((t) => ({
      name: t.apiType,
      tokens: t.totalTokens || 0,
      avgLatency: t.avgLatency || 0,
    }));
  }, [typeData]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Overview</h1>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            {selectedRange.label}
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden animate-fade-in">
              {TIME_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => { setSelectedRange(opt); setDropdownOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent",
                    selectedRange.days === opt.days
                      ? "text-foreground font-medium bg-accent/50"
                      : "text-muted-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2",
              activeTab === tab
                ? "text-foreground border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tokens" value={tokens.toLocaleString()} quota={`${tokens.toLocaleString()} / 1.0M`} />
            <StatCard label="Search Queries" value={searches} quota={`${searches} / 10.0K`} />
            <StatCard label="Embed Calls" value={embeds} />
            <StatCard label="Avg Latency" value={`${avgLatency}ms`} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Token Usage – Embed vs Search (bar chart from byType) */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-medium text-foreground">Token Usage</p>
              <p className="text-xs text-muted-foreground">Embed vs Search token consumption</p>
              {tokenByType.length > 0 ? (
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tokenByType} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                      <Bar dataKey="tokens" name="Tokens" radius={[6, 6, 0, 0]}>
                        {tokenByType.map((entry, idx) => (
                          <Cell key={idx} fill={entry.name === "EMBED" ? "#3b82f6" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="tokens" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Tokens" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Latency Overview – Embed vs Search (bar from byType) + daily trend */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-medium text-foreground">Latency Overview</p>
              <p className="text-xs text-muted-foreground">Embed vs Search avg latency (ms)</p>
              {tokenByType.length > 0 ? (
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tokenByType} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                      <Bar dataKey="avgLatency" name="Avg Latency (ms)" radius={[6, 6, 0, 0]}>
                        {tokenByType.map((entry, idx) => (
                          <Cell key={idx} fill={entry.name === "EMBED" ? "#3b82f6" : "#22c55e"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      <Line type="monotone" dataKey="avgLatency" stroke="hsl(var(--warning))" strokeWidth={2} dot={false} name="Avg Latency (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Request types donut */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-2">
              <p className="text-sm font-medium text-foreground">Request Types</p>
              <p className="text-xs text-muted-foreground">Distribution of API request types</p>
              <div className="h-44 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={2} dataKey="value">
                      {donutData.map((_, idx) => (
                        <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend formatter={(val) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{val}</span>} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Trend – Embeds vs Searches */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-sm font-medium text-foreground">Daily Requests</p>
              <p className="text-xs text-muted-foreground mt-0.5">Embed and Search calls over time</p>
            </div>
            <div className="p-5 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="embeds" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Embeds" stackId="a" />
                  <Bar dataKey="searches" fill="#22c55e" radius={[4, 4, 0, 0]} name="Searches" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Documents table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-foreground">Recent Documents</h2>
                <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                  {items.length} records
                </span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Input</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Intent</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Dimensions</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No documents yet. Head to Data Explorer to add your first record.
                    </td>
                  </tr>
                ) : (
                  items.slice(0, 5).map((item, i) => (
                    <tr key={item.id || i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-foreground truncate">{item.input || "—"}</p>
                        <span className="text-[10px] font-mono text-muted-foreground">ID: {item.id}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">{item.intent || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{item.dimensions || 768}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Memory Graph Tab ── */}
      {activeTab === "Memory Graph" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Knowledge Graph</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nodes are embedded questions. Edges show cosine similarity between their vector embeddings.
              Closer nodes = more similar embeddings. Percentages show similarity score.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full border-2" style={{ borderColor: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.12)" }} />
              Question (with Intent)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-6 h-0.5 rounded" style={{ background: "hsl(var(--primary))", opacity: 0.5 }} />
              Embedding Similarity
            </span>
          </div>

          {items.length > 0 || similarityEdges.length > 0 ? (
            <div className="h-[440px] rounded-lg border border-border bg-background/50 overflow-hidden">
              <ForceGraph edges={similarityEdges} items={items} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                <svg className="h-6 w-6 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">No vector data available yet</p>
              <p className="text-xs text-muted-foreground/60 text-center max-w-[240px]">
                Embed some data using the Data Explorer to see the knowledge graph here
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
