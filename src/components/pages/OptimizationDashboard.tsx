import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Pie, PieChart, Cell, Bar, BarChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useRecommendations, type Recommendation } from "@/hooks/useRecommendations";
import { useRecTargets } from "@/hooks/useRecTargets";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function OptimizationDashboard() {
  // SEO tags
  useEffect(() => {
    document.title = "AI Optimization Dashboard – Seek.ai";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "AI Optimization Dashboard: Data-driven recommendations to improve AI search visibility");
    document.head.appendChild(metaDesc);

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.origin + "/optimization");
    document.head.appendChild(canonical);
  }, []);

  const { data: recommendations, loading } = useRecommendations();
  const { data: targets } = useRecTargets();

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selected, setSelected] = useState<Recommendation | null>(null);

  const types = useMemo(() => {
    const arr = Array.from(new Set((recommendations || []).map(r => (r as any).type).filter(Boolean))) as string[];
    return arr;
  }, [recommendations]);

  const statuses = useMemo(() => {
    return Array.from(new Set((recommendations || []).map(r => r.status).filter(Boolean))) as string[];
  }, [recommendations]);

  const priorities = ["1", "2", "3", "4", "5"]; // generic 1-5 scale

  const filtered = useMemo(() => {
    let rows = [...(recommendations || [])];
    if (typeFilter !== "all") rows = rows.filter(r => (r as any).type === typeFilter);
    if (statusFilter !== "all") rows = rows.filter(r => (r.status || "").toLowerCase() === statusFilter.toLowerCase());
    if (priorityFilter !== "all") rows = rows.filter(r => String(r.priority ?? "") === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.title || "").toLowerCase().includes(q) || (r.recommendation || "").toLowerCase().includes(q) || (r.owner || "").toLowerCase().includes(q));
    }
    // sort by priority desc default
    rows.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return rows;
  }, [recommendations, typeFilter, statusFilter, priorityFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1); // reset on filters change
  }, [typeFilter, statusFilter, priorityFilter, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const open = recommendations.filter(r => (r.status || "").toLowerCase() === "open").length;
    const inProgress = recommendations.filter(r => (r.status || "").toLowerCase().includes("progress")).length;
    const completed30 = recommendations.filter(r => (r.status || "").toLowerCase() === "done" && new Date(r.created_at) >= last30).length;
    const avgConf = recommendations.length ? Math.round((recommendations.reduce((sum, r) => sum + (r.confidence || 0), 0) / recommendations.length) * 10) / 10 : 0;
    return { open, inProgress, completed30, avgConf };
  }, [recommendations]);

  const domainList = useMemo(() => {
    const counts: Record<string, number> = {};
    targets.filter(t => (t.target_type || "").toLowerCase() === "domain").forEach(t => {
      const key = (t.target_value || "").toLowerCase();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [targets]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (recommendations || []).forEach(r => {
      const t = (r as any).type as string | undefined;
      if (!t) return;
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [recommendations]);

  const avgConfidenceByType = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    (recommendations || []).forEach(r => {
      const t = (r as any).type as string | undefined;
      if (!t) return;
      map[t] = map[t] || { sum: 0, count: 0 };
      map[t].sum += r.confidence || 0;
      map[t].count += 1;
    });
    return Object.entries(map).map(([type, { sum, count }]) => ({ type, value: count ? Math.round((sum / count) * 10) / 10 : 0 }));
  }, [recommendations]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Optimization Dashboard</h1>
        <p className="text-muted-foreground">Data-driven recommendations to improve AI search visibility</p>
      </header>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm text-muted-foreground">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {types.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {statuses.map(s => (
                  <SelectItem key={s} value={s!}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Priority</label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {priorities.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Search</label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, description, owner..." className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatChip label="Open Recommendations" value={stats.open} />
        <StatChip label="In Progress" value={stats.inProgress} />
        <StatChip label="Completed (30d)" value={stats.completed30} />
        <StatChip label="Average Confidence" value={`${stats.avgConf}%`} />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Effort</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : paged.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No recommendations found</TableCell></TableRow>
                  ) : (
                    paged.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                        <TableCell><PriorityPill value={r.priority} /></TableCell>
                        <TableCell>{(r as any).type ? <Badge variant="secondary">{(r as any).type}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <button onClick={(e) => { e.stopPropagation(); setSelected(r); }} className="text-primary hover:underline text-left">
                            {r.title || r.recommendation || "Untitled"}
                          </button>
                        </TableCell>
                        <TableCell><StatusPill status={r.status} /></TableCell>
                        <TableCell>{r.effort ?? "—"}</TableCell>
                        <TableCell>{r.impact ?? "—"}</TableCell>
                        <TableCell>{typeof r.confidence === "number" ? `${r.confidence}%` : "—"}</TableCell>
                        <TableCell>{r.owner || "—"}</TableCell>
                        <TableCell>{format(new Date(r.created_at), "MMM d, yyyy")}</TableCell>
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
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </CardContent>
        </Card>

        {/* Right - insights */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Top Target Domains</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {domainList.length === 0 ? (
                  <li className="text-sm text-muted-foreground">No domain targets found</li>
                ) : (
                  domainList.map(([domain, count]) => (
                    <li key={domain} className="flex items-center justify-between text-sm">
                      <span className="truncate">{domain}</span>
                      <Badge variant="outline">{count}</Badge>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Most Common Recommendation Types</CardTitle></CardHeader>
            <CardContent>
              {typeCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No type data available</p>
              ) : (
                <ChartContainer className="h-60" config={{}}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={typeCounts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} strokeWidth={2}>
                        {typeCounts.map((_, idx) => (
                          <Cell key={idx} fill={`hsl(var(--chart-${(idx % 5) + 1}))`} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Avg Confidence by Type</CardTitle></CardHeader>
            <CardContent>
              {avgConfidenceByType.length === 0 ? (
                <p className="text-sm text-muted-foreground">No type data available</p>
              ) : (
                <ChartContainer className="h-64" config={{}}>
                  <ResponsiveContainer>
                    <BarChart data={avgConfidenceByType} layout="vertical" margin={{ left: 24, right: 12 }}>
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis type="category" dataKey="type" width={120} />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]} fill="hsl(var(--primary))" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {selected && <RecommendationDetail rec={selected} onClose={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PriorityPill({ value }: { value?: number | null }) {
  const v = value ?? 0;
  const color = v >= 4 ? "destructive" : v === 3 ? "default" : "secondary";
  return <Badge variant={color as any}>{v || "—"}</Badge>;
}

function StatusPill({ status }: { status?: string | null }) {
  const s = (status || "").toLowerCase();
  const variant = s === "done" ? "secondary" : s.includes("progress") ? "default" : "outline";
  const label = status || "—";
  return <Badge variant={variant as any}>{label}</Badge>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="rounded-lg border bg-card text-card-foreground p-4">{children}</div>
    </div>
  );
}

function RecommendationDetail({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const [targets, setTargets] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [experiments, setExperiments] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        const [{ data: t }, { data: e }, { data: c }, { data: x }] = await Promise.all([
          (supabase.from('rec_targets' as any) as any).select('*').eq('rec_id', rec.id),
          (supabase.from('rec_evidence' as any) as any).select('*').eq('rec_id', rec.id),
          (supabase.from('rec_changes' as any) as any).select('*').eq('rec_id', rec.id).order('created_at', { ascending: false }),
          (supabase.from('experiments' as any) as any).select('*').eq('rec_id', rec.id).order('start_at', { ascending: false }),
        ]);
        if (!cancelled) {
          setTargets(t || []);
          setEvidence(e || []);
          setChanges(c || []);
          setExperiments(x || []);
        }
      } catch (e) {
        // ignore
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [rec.id]);

  return (
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>{rec.title || rec.recommendation || "Untitled"}</SheetTitle>
        <SheetDescription>
          <div className="flex flex-wrap gap-2 mt-2">
            {(rec as any).type && <Badge variant="secondary">{(rec as any).type}</Badge>}
            <StatusPill status={rec.status} />
            <PriorityPill value={rec.priority} />
            <Badge variant="outline">Effort {rec.effort ?? "—"}</Badge>
            <Badge variant="outline">Impact {rec.impact ?? "—"}</Badge>
            {typeof rec.confidence === "number" && <Badge variant="outline">Confidence {rec.confidence}%</Badge>}
          </div>
        </SheetDescription>
      </SheetHeader>

      {rec.detail_md && (
        <Section title="Details">
          <div className={cn("prose prose-sm max-w-none", "prose-headings:font-semibold prose-p:leading-relaxed")}> 
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rec.detail_md}</ReactMarkdown>
          </div>
        </Section>
      )}

      <Section title="Targets">
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No targets</p>
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
                <TableRow key={`${t.rec_id}-${t.target_type}-${t.target_value}`}>
                  <TableCell>{t.target_type}</TableCell>
                  <TableCell className="break-all">{t.target_value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Evidence">
        {evidence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No evidence</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Before</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((ev) => (
                <TableRow key={`${ev.rec_id}-${ev.metric_key}`}>
                  <TableCell>{ev.metric_key || "—"}</TableCell>
                  <TableCell>{ev.metric_before ?? "—"}</TableCell>
                  <TableCell>{ev.metric_target ?? "—"}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{ev.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title="Changes">
        {changes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes</p>
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
                <TableRow key={`${c.rec_id}-${c.created_at}-${c.change_type}`}>
                  <TableCell>{c.change_type || "—"}</TableCell>
                  <TableCell>{c.created_at ? format(new Date(c.created_at), "MMM d, yyyy") : "—"}</TableCell>
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
        {experiments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No experiments</p>
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
                <TableRow key={`${x.rec_id}-${x.variant}-${x.start_at}`}> 
                  <TableCell>{x.variant}</TableCell>
                  <TableCell>{x.start_at ? format(new Date(x.start_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell>{x.end_at ? format(new Date(x.end_at), "MMM d, yyyy") : "—"}</TableCell>
                  <TableCell className="whitespace-pre-wrap">{x.result_json ? JSON.stringify(x.result_json) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}
