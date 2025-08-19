import React, { useEffect, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useRecommendations } from "@/hooks/useRecommendations";
import { format } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flag, Circle } from "lucide-react";

// Helper pills
function PriorityPill({ value }: { value?: number | null }) {
  const v = value ?? 0;
  const variant = v <= 1 ? "destructive" : v <= 3 ? "default" : "secondary";
  return (
    <Badge variant={variant as any}>
      <span className="inline-flex items-center gap-1">
        <Flag className="h-3 w-3 text-muted-foreground" />
        {v || "—"}
      </span>
    </Badge>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();
  const variant = s === "done" ? "secondary" : s.includes("progress") ? "default" : s === "dismissed" ? "outline" : "outline";
  const label = status || "—";
  return (
    <Badge variant={variant as any}>
      <span className="inline-flex items-center gap-1">
        <Circle className="h-3 w-3 text-muted-foreground" />
        {label}
      </span>
    </Badge>
  );
}

const PSEUDO_RECS = [
  { id: "r1", type: "Content", title: "Add FAQ schema to /pricing", detail_md: "", priority: 1, effort: 2, impact: 5, confidence: 88, owner: "Alex", status: "open", created_at: new Date().toISOString() },
  { id: "r2", type: "Technical", title: "Fix duplicate titles on blog", detail_md: "", priority: 2, effort: 3, impact: 4, confidence: 76, owner: "Sam", status: "in_progress", created_at: new Date(Date.now()-86400000*2).toISOString() },
  { id: "r3", type: "Content", title: "Add internal links to /guide", detail_md: "", priority: 3, effort: 2, impact: 3, confidence: 70, owner: "Taylor", status: "done", created_at: new Date(Date.now()-86400000*7).toISOString() },
  { id: "r4", type: "Technical", title: "Resolve 404s for /signup", detail_md: "", priority: 1, effort: 1, impact: 5, confidence: 92, owner: "Jordan", status: "open", created_at: new Date(Date.now()-86400000*1).toISOString() },
  { id: "r5", type: "Content", title: "Expand comparison pages", detail_md: "", priority: 4, effort: 3, impact: 3, confidence: 64, owner: "Riley", status: "dismissed", created_at: new Date(Date.now()-86400000*10).toISOString() },
  { id: "r6", type: "Internal Links", title: "Link /solutions across top nav", detail_md: "", priority: 2, effort: 2, impact: 4, confidence: 80, owner: "Casey", status: "open", created_at: new Date(Date.now()-86400000*3).toISOString() },
];

const PSEUDO_DOMAINS: [string, number][] = [
  ["example.com", 24],
  ["support.example.com", 18],
  ["docs.example.com", 12],
  ["partner.com", 10],
  ["blog.example.com", 9],
  ["news.site.com", 8],
  ["forum.example.com", 7],
  ["reviews.com", 6],
  ["shop.example.com", 5],
  ["cdn.example.com", 4],
];

const PSEUDO_TYPE_COUNTS = [
  { name: "Content", value: 14 },
  { name: "Technical", value: 9 },
  { name: "Internal Links", value: 6 },
  { name: "Schema", value: 3 },
];

const PSEUDO_AVG_CONF = [
  { type: "Content", value: 86 },
  { type: "Technical", value: 74 },
  { type: "Internal Links", value: 71 },
  { type: "Schema", value: 65 },
];

export function Optimization() {
  // Basic SEO tags
  useEffect(() => {
    document.title = "AI Optimization Dashboard – Seek.ai";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "AI Optimization Dashboard: Data-driven recommendations to improve AI search visibility");
    document.head.appendChild(meta);
  }, []);

  // URL query params
  const [searchParams, setSearchParams] = useSearchParams();
  const typeParam = searchParams.get('type') || 'all';
  const statusParam = searchParams.get('status') || 'all';
  const priorityParam = searchParams.get('priority') || 'all';
  const searchParam = searchParams.get('search') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = 10;

  // Distinct types
  const [types, setTypes] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    async function fetchTypes() {
      try {
        const { data, error } = await ((supabase.from('recommendation' as any) as any)
          .select('type')
          .not('type', 'is', null)
          .order('type'));
        if (error) throw error;
        if (cancelled) return;
        const unique = Array.from(new Set((data || []).map((d: any) => d.type))).filter(Boolean) as string[];
        setTypes(unique);
      } catch {}
    }
    fetchTypes();
    return () => { cancelled = true; };
  }, []);

  // Helper to update URL params
  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') next.delete(k); else next.set(k, v);
    });
    // Reset page when filters change (unless only page is being set)
    if (!('page' in changes) || Object.keys(changes).length > 1) {
      next.set('page', '1');
    }
    setSearchParams(next, { replace: true });
  };

  const { data, total, isLoading } = useRecommendations({
    type: typeParam !== 'all' ? typeParam : undefined,
    status: statusParam !== 'all' ? statusParam : undefined,
    priority: priorityParam !== 'all' ? Number(priorityParam) : undefined,
    search: searchParam || undefined,
    page,
    pageSize,
  });

  // Right-column data states
  const [domains, setDomains] = useState<[string, number][]>([]);
  const [loadingDomains, setLoadingDomains] = useState<boolean>(true);
  const [typeCounts, setTypeCounts] = useState<{ name: string; value: number }[]>([]);
  const [avgConf, setAvgConf] = useState<{ type: string; value: number }[]>([]);
  const [loadingMeta, setLoadingMeta] = useState<boolean>(true);

  // Fetch Top Target Domains
  useEffect(() => {
    let cancelled = false;
    async function fetchDomains() {
      try {
        setLoadingDomains(true);
        const { data } = await ((supabase.from('rec_targets' as any) as any)
          .select('target_type, target_value')
          .eq('target_type', 'domain'));
        if (cancelled) return;
        const counts: Record<string, number> = {};
        (data || []).forEach((row: any) => {
          const key = (row.target_value || '').toLowerCase();
          if (!key) return;
          counts[key] = (counts[key] || 0) + 1;
        });
        const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        setDomains(list as [string, number][]);
      } finally {
        if (!cancelled) setLoadingDomains(false);
      }
    }
    fetchDomains();
    return () => { cancelled = true; };
  }, []);

  // Fetch Recommendation type distribution and avg confidence by type
  useEffect(() => {
    let cancelled = false;
    async function fetchMeta() {
      try {
        setLoadingMeta(true);
        const { data } = await ((supabase.from('recommendation' as any) as any)
          .select('type, confidence'));
        if (cancelled) return;
        const counts: Record<string, number> = {};
        const confAgg: Record<string, { sum: number; count: number }> = {};
        (data || []).forEach((row: any) => {
          const t = row.type as string | undefined;
          if (!t) return;
          counts[t] = (counts[t] || 0) + 1;
          const c = typeof row.confidence === 'number' ? row.confidence : 0;
          confAgg[t] = confAgg[t] || { sum: 0, count: 0 };
          confAgg[t].sum += c;
          confAgg[t].count += 1;
        });
        setTypeCounts(Object.entries(counts).map(([name, value]) => ({ name, value })));
        const avg = Object.entries(confAgg).map(([type, { sum, count }]) => ({
          type,
          value: count ? Math.round((sum / count) * 10) / 10 : 0,
        })).sort((a, b) => b.value - a.value);
        setAvgConf(avg);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { cancelled = true; };
  }, []);

  const [selected, setSelected] = useState<any | null>(null);
  const usePseudoTable = !isLoading && data.length === 0;
  const rows = usePseudoTable ? PSEUDO_RECS.slice((page - 1) * pageSize, page * pageSize) : data;
  const effectiveTotal = usePseudoTable ? PSEUDO_RECS.length : (total || 0);
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / pageSize));

  // Pseudo fallbacks for right column
  const domainsData = (!loadingDomains && domains.length === 0) ? PSEUDO_DOMAINS : domains;
  const typeCountsData = (!loadingMeta && typeCounts.length === 0) ? PSEUDO_TYPE_COUNTS : typeCounts;
  const avgConfData = (!loadingMeta && avgConf.length === 0) ? PSEUDO_AVG_CONF : avgConf;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Optimization Dashboard</h1>
        <p className="text-muted-foreground">Data-driven recommendations to improve AI search visibility</p>
      </header>

      {/* Top filter bar */}
      <div className="rounded-2xl border border-gray-100 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm shadow-none hover:shadow-md transition-shadow">
        <div className="grid gap-4 p-6 md:grid-cols-4">
          <div>
            <label className="text-sm text-muted-foreground">Type</label>
            <Select value={typeParam} onValueChange={(v) => updateParams({ type: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <Select value={statusParam} onValueChange={(v) => updateParams({ status: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Priority</label>
            <Select value={priorityParam} onValueChange={(v) => updateParams({ priority: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {[1,2,3,4,5].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Search</label>
            <Input value={searchParam} onChange={(e) => updateParams({ search: e.target.value })} placeholder="Search title, description, owner..." className="mt-1" />
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Recommendations Table (placeholder) */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm shadow-none hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Recommendations</h2>
              <p className="text-sm text-muted-foreground">Prioritized actions to improve AI search visibility</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Effort</TableHead>
                    <TableHead className="hidden sm:table-cell">Impact</TableHead>
                    <TableHead className="hidden sm:table-cell">Confidence</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-64 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <div className="rounded-xl border bg-background/60 p-8 text-center">
                          <h4 className="text-base font-semibold">No recommendations</h4>
                          <p className="mt-1 text-sm text-muted-foreground">There are no items to display for this selection.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                        <TableCell className="py-2"><PriorityPill value={r.priority} /></TableCell>
                        <TableCell className="hidden sm:table-cell py-2">{r.type ? <Badge variant="secondary">{r.type}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="py-2">
                          <button onClick={(e) => { e.stopPropagation(); setSelected(r); }} className="text-primary hover:underline text-left">{r.title || "Untitled"}</button>
                        </TableCell>
                        <TableCell className="py-2"><StatusPill status={r.status} /></TableCell>
                        <TableCell className="hidden sm:table-cell py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{r.effort ?? "—"}</span>
                            </TooltipTrigger>
                            <TooltipContent>Effort (1–5 = T-shirt sizing)</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{r.impact ?? "—"}</span>
                            </TooltipTrigger>
                            <TooltipContent>Impact (1–5 = T-shirt sizing)</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{typeof r.confidence === 'number' ? `${r.confidence}%` : "—"}</span>
                            </TooltipTrigger>
                            <TooltipContent>Model confidence (%)</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-2">{r.owner || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell py-2">{r.created_at ? format(new Date(r.created_at), 'MMM d, yyyy') : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); updateParams({ page: String(Math.max(1, page - 1)) }); }} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); updateParams({ page: String(Math.min(totalPages, page + 1)) }); }} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>

        {/* Right: 3 empty metric cards */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm shadow-none hover:shadow-md transition-shadow">
            <div className="p-6">
              <h3 className="text-base font-semibold">Top Target Domains</h3>
              <div className="mt-4 space-y-3">
                {loadingDomains ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-6 w-10 rounded-full" />
                    </div>
                  ))
                ) : domainsData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No domain targets found</p>
                ) : (
                  <ul className="space-y-2">
                    {domainsData.map(([domain, count]) => (
                      <li key={domain} className="flex items-center justify-between text-sm">
                        <span className="truncate">{domain}</span>
                        <Badge variant="outline">{count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm shadow-none hover:shadow-md transition-shadow">
            <div className="p-6">
              <h3 className="text-base font-semibold">Recommendation Types</h3>
              {loadingMeta ? (
                <Skeleton className="h-40 w-full" />
              ) : typeCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No type data available</p>
              ) : (
                <ChartContainer className="h-60" config={{}}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={typeCounts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
                        {typeCounts.map((_, idx) => (
                          <Cell key={idx} fill={idx === 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-background/70 supports-[backdrop-filter]:backdrop-blur-sm shadow-none hover:shadow-md transition-shadow">
            <div className="p-6">
              <h3 className="text-base font-semibold">Avg Confidence by Type</h3>
              {loadingMeta ? (
                <Skeleton className="h-64 w-full" />
              ) : avgConf.length === 0 ? (
                <p className="text-sm text-muted-foreground">No type data available</p>
              ) : (
                <ChartContainer className="h-64" config={{}}>
                  <ResponsiveContainer>
                    <BarChart data={avgConf} layout="vertical" margin={{ left: 24, right: 12 }}>
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="type" width={120} />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]} fill="hsl(var(--primary))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <RecommendationDetail rec={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-lg border bg-card text-card-foreground p-4">{children}</div>
    </div>
  );
}

function RecommendationDetail({ rec }: { rec: any }) {
  const [fullRec, setFullRec] = useState<any>(rec);
  const [loadingRec, setLoadingRec] = useState<boolean>(true);

  const [targets, setTargets] = useState<any[]>([]);
  const [loadingTargets, setLoadingTargets] = useState<boolean>(true);

  const [evidence, setEvidence] = useState<any[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState<boolean>(true);
  const [citationMap, setCitationMap] = useState<Record<string, string>>({});

  const [changes, setChanges] = useState<any[]>([]);
  const [loadingChanges, setLoadingChanges] = useState<boolean>(true);

  const [experiments, setExperiments] = useState<any[]>([]);
  const [loadingExperiments, setLoadingExperiments] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        setLoadingRec(true);
        const { data: recRows } = await ((supabase.from('recommendation' as any) as any)
          .select('*')
          .eq('id', rec.id)
          .limit(1));
        if (!cancelled && recRows && recRows[0]) setFullRec(recRows[0]);
      } finally {
        if (!cancelled) setLoadingRec(false);
      }

      try {
        setLoadingTargets(true);
        const { data: t } = await ((supabase.from('rec_targets' as any) as any)
          .select('*')
          .eq('rec_id', rec.id));
        if (!cancelled) setTargets(t || []);
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }

      try {
        setLoadingEvidence(true);
        const { data: e } = await ((supabase.from('rec_evidence' as any) as any)
          .select('*')
          .eq('rec_id', rec.id));
        if (!cancelled) setEvidence(e || []);

        const ids = (e || []).map((row: any) => row.citation_id).filter(Boolean);
        if (ids.length) {
          const { data: cits } = await ((supabase.from('citation' as any) as any)
            .select('id,url')
            .in('id', ids));
          const map: Record<string, string> = {};
          (cits || []).forEach((c: any) => { if (c.id) map[c.id] = c.url || ''; });
          if (!cancelled) setCitationMap(map);
        } else {
          if (!cancelled) setCitationMap({});
        }
      } finally {
        if (!cancelled) setLoadingEvidence(false);
      }

      try {
        setLoadingChanges(true);
        const { data: c } = await ((supabase.from('rec_changes' as any) as any)
          .select('*')
          .eq('rec_id', rec.id)
          .order('created_at', { ascending: false }));
        if (!cancelled) setChanges(c || []);
      } finally {
        if (!cancelled) setLoadingChanges(false);
      }

      try {
        setLoadingExperiments(true);
        const { data: x } = await ((supabase.from('experiments' as any) as any)
          .select('*')
          .eq('rec_id', rec.id)
          .order('start_at', { ascending: false }));
        if (!cancelled) setExperiments(x || []);
      } finally {
        if (!cancelled) setLoadingExperiments(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [rec.id]);

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{fullRec?.title || fullRec?.recommendation || 'Untitled'}</SheetTitle>
        <SheetDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            {fullRec?.type && <Badge variant="secondary">{fullRec.type}</Badge>}
            <StatusPill status={fullRec?.status} />
            <PriorityPill value={fullRec?.priority} />
            <Badge variant="outline">Effort {fullRec?.effort ?? '—'}</Badge>
            <Badge variant="outline">Impact {fullRec?.impact ?? '—'}</Badge>
            {typeof fullRec?.confidence === 'number' && <Badge variant="outline">Confidence {fullRec.confidence}%</Badge>}
          </div>
        </SheetDescription>
      </SheetHeader>

      {loadingRec ? (
        <Section title="Details"><Skeleton className="h-24 w-full" /></Section>
      ) : fullRec?.detail_md ? (
        <Section title="Details">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{fullRec.detail_md}</ReactMarkdown>
          </div>
        </Section>
      ) : null}

      <Section title="Targets">
        {loadingTargets ? (
          <Skeleton className="h-24 w-full" />
        ) : targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.map((t) => (
                <TableRow key={`${t.id}`}>
                  <TableCell>{t.target_type}</TableCell>
                  <TableCell className="break-all">{t.target_value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Evidence">
        {loadingEvidence ? (
          <Skeleton className="h-24 w-full" />
        ) : evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Citation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((ev) => (
                <TableRow key={`${ev.rec_id}-${ev.metric_key}`}>
                  <TableCell>{ev.metric_key || '—'}</TableCell>
                  <TableCell>{ev.metric_before ?? '—'}</TableCell>
                  <TableCell>{ev.metric_target ?? '—'}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{ev.notes || '—'}</TableCell>
                  <TableCell>
                    {ev.citation_id && citationMap[ev.citation_id] ? (
                      <a href={citationMap[ev.citation_id]} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Changes">
        {loadingChanges ? (
          <Skeleton className="h-24 w-full" />
        ) : changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>PR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((c) => (
                <TableRow key={`${c.id}`}>
                  <TableCell>{c.change_type || '—'}</TableCell>
                  <TableCell>{c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>
                    {c.pr_url ? (
                      <a href={c.pr_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View PR</a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Experiments">
        {loadingExperiments ? (
          <Skeleton className="h-24 w-full" />
        ) : experiments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {experiments.map((x) => (
                <TableRow key={`${x.id}`}> 
                  <TableCell>{x.variant}</TableCell>
                  <TableCell>{x.start_at ? format(new Date(x.start_at), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell>{x.end_at ? format(new Date(x.end_at), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{x.result_json ? JSON.stringify(x.result_json) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}


