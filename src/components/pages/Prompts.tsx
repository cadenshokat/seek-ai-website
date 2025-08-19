import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useToast } from "@/hooks/use-toast";

interface PromptRow {
  id: string;
  prompt: string;
  topic?: string | null;
  is_active: boolean;
  created_at: string | null;
  brand_id?: string | null;
}

type TabKey = "active" | "inactive" | "suggested";
type SortKey = "prompt" | "created_at" | "position" | "sentiment" | "visibility";
type SortDir = "asc" | "desc";

type PMRow = {
  day: string;              
  prompt_id: string;
  model_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  mention_count: number;
  avg_position: number | null;
  avg_sentiment_score: number | null;
};

type PromptWithMetrics = PromptRow & {
  _mentionCount?: number;
  _avgPosition?: number | null;
  _avgSentiment01?: number | null;   
  _visibilityPct?: number;          
};


function toISO(d: Date) {
  return new Date(d).toISOString();
}

function sentimentTo01(score: number | null | undefined): number | null {
  if (score == null) return null;
  return Math.round(((score + 1) / 2) * 100);
}

function classNames(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}


export function Prompts() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { selectedBrand, getSelectedBrandName } = useBrands();
  const { selectedModel, getSelectedModelName } = useModels();
  const { selectedRange } = useTimeRange();

  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [metricsByPrompt, setMetricsByPrompt] = useState<Record<string, { mentionCount: number; avgPosition: number | null; avgSentiment01: number | null;}>>({});

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ prompt: "", topic: "", is_active: true });

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const fetchPrompts = async () => {
      setLoading(true);
      try {
        let q = supabase.from("prompts").select("*").order("created_at", { ascending: false });

        if (activeTab === "active") q = q.eq("is_active", true);
        if (activeTab === "inactive") q = q.eq("is_active", false);

        const { data, error } = await q;
        if (error) throw error;
        setPrompts(data || []);
      } catch (e) {
        console.error(e);
        toast({ title: "Error", description: "Failed to load prompts", variant: "destructive" });
        setPrompts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPrompts();
  }, [activeTab, selectedBrand, toast]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!selectedBrand) {
        setMetricsByPrompt({});
        return;
      }

      try {
        const startISO = toISO(selectedRange.start);
        const endISO = toISO(selectedRange.end);

        let q = supabase
          .from("prompt_mentions")
          .select("day,prompt_id,model_id,entity_type,entity_id,mention_count,avg_position,avg_sentiment_score")
          .gte("day", startISO)
          .lte("day", endISO)
          .eq("entity_id", selectedBrand);

        if (selectedModel) {
          q = q.eq("model_id", selectedModel);
        }

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data || []) as PMRow[];

        const agg: Record<string, { mc: number; posSum: number; posW: number; sentSum: number; sentW: number }> = {};
        for (const r of rows) {
          const key = r.prompt_id;
          const mc = Number(r.mention_count || 0);
          const pos = r.avg_position ?? null;
          const sent = r.avg_sentiment_score ?? null;

          if (!agg[key]) agg[key] = { mc: 0, posSum: 0, posW: 0, sentSum: 0, sentW: 0 };
          agg[key].mc += mc;

          if (pos != null) { agg[key].posSum += pos * mc; agg[key].posW += mc; }
          if (sent != null) { agg[key].sentSum += sent * mc; agg[key].sentW += mc; }
        }

        const out: Record<string, { mentionCount: number; avgPosition: number | null; avgSentiment01: number | null }> = {};
        Object.entries(agg).forEach(([pid, v]) => {
          const avgPos = v.posW ? v.posSum / v.posW : null;
          const avgSent = v.sentW ? v.sentSum / v.sentW : null;
          out[pid] = {
            mentionCount: v.mc,
            avgPosition: avgPos,
            avgSentiment01: sentimentTo01(avgSent),
          };
        });

        setMetricsByPrompt(out);
      } catch (e) {
        console.error(e);
        setMetricsByPrompt({});
      }
    };

    fetchMetrics();
  }, [selectedBrand, selectedModel, selectedRange]);

  const rowsWithMetrics: PromptWithMetrics[] = useMemo(() => {
    const mapped = prompts.map((p) => {
      const m = metricsByPrompt[p.id];
      return {
        ...p,
        _mentionCount: m?.mentionCount ?? 0,
        _avgPosition: m?.avgPosition ?? null,
        _avgSentiment01: m?.avgSentiment01 ?? null,
        _visibilityPct: 0,
      };
    });

    const maxMentions = Math.max(1, ...mapped.map((r) => r._mentionCount ?? 0));
    mapped.forEach((r) => {
      const pct = Math.round(((r._mentionCount || 0) / maxMentions) * 100);
      r._visibilityPct = pct;
    });

    return mapped;
  }, [prompts, metricsByPrompt]);

  const promptsSorted = useMemo(() => {
    const copy = [...rowsWithMetrics];
    copy.sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";

      switch (sortKey) {
        case "prompt":
          va = a.prompt || "";
          vb = b.prompt || "";
          break;
        case "created_at":
          va = a.created_at || "";
          vb = b.created_at || "";
          break;
        case "position":
          va = a._avgPosition ?? Number.POSITIVE_INFINITY;
          vb = b._avgPosition ?? Number.POSITIVE_INFINITY;
          break;
        case "sentiment":
          va = a._avgSentiment01 ?? -1;
          vb = b._avgSentiment01 ?? -1;
          break;
        case "visibility":
          va = a._visibilityPct ?? 0;
          vb = b._visibilityPct ?? 0;
          break;
      }

      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rowsWithMetrics, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "prompt" ? "asc" : "desc"); }
  };

  const activeCount = prompts.filter((p) => p.is_active).length;
  const inactiveCount = prompts.filter((p) => !p.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Prompt</Label>
                <Textarea
                  id="prompt"
                  value={newPrompt.prompt}
                  onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                  placeholder="Enter your prompt here..."
                  className="min-h-[100px] mt-1"
                />
              </div>
              <div>
                <Label htmlFor="topic">Topic (optional)</Label>
                <Input
                  id="topic"
                  value={newPrompt.topic}
                  onChange={(e) => setNewPrompt({ ...newPrompt, topic: e.target.value })}
                  placeholder="Enter topic/tag"
                  className="mt-1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={newPrompt.is_active}
                  onCheckedChange={(checked) => setNewPrompt({ ...newPrompt, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={async () => {
                  if (!newPrompt.prompt.trim()) return toast({ title: "Prompt required", description: "Please enter a prompt." });
                  try {
                    const payload: Partial<PromptRow> = {
                      prompt: newPrompt.prompt.trim(),
                      topic: newPrompt.topic?.trim() || null,
                      is_active: newPrompt.is_active,
                      brand_id: selectedBrand || null,
                    };
                    const { data, error } = await supabase.from("prompts").insert(payload).select("*").single();
                    if (error) throw error;
                    setPrompts((prev) => [data as PromptRow, ...prev]);
                    setIsAddDialogOpen(false);
                    setNewPrompt({ prompt: "", topic: "", is_active: true });
                    toast({ title: "Added", description: "New prompt created." });
                  } catch (e) {
                    console.error(e);
                    toast({ title: "Error", description: "Failed to add prompt", variant: "destructive" });
                  }
                }}>
                  Add Prompt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="grid w-fit grid-cols-3">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="suggested">
            Suggested
            <Badge variant="secondary" className="ml-2">25</Badge>
          </TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <PromptTable
            loading={loading}
            rows={promptsSorted}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(id) => navigate(`/prompts/${id}`)}
          />
        </TabsContent>

        <TabsContent value="inactive" className="mt-6">
          <PromptTable
            loading={loading}
            rows={promptsSorted}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(id) => navigate(`/prompts/${id}`)}
          />
        </TabsContent>

        {/* Suggested placeholder */}
        <TabsContent value="suggested" className="mt-6">
          <div className="text-sm text-gray-500">Suggested prompts coming soon.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Table -------------------------------------------------------------------

function SentimentPill({ n }: { n: number | null | undefined }) {
  if (n == null) return <span className="text-sm text-gray-400">—</span>;
  const color =
    n >= 70 ? "bg-emerald-100 text-emerald-700" :
    n >= 40 ? "bg-gray-100 text-gray-700" :
              "bg-rose-100 text-rose-700";
  return (
    <span className={classNames("inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {n}
    </span>
  );
}

function VisibilityBar({ pct }: { pct: number | undefined }) {
  const v = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-gray-900 rounded-full"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-sm text-gray-700">{v}%</span>
    </div>
  );
}

function PromptTable({
  loading,
  rows,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: {
  loading: boolean;
  rows: PromptWithMetrics[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onRowClick: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-6 font-medium text-gray-600 text-sm">
                <button onClick={() => onSort("prompt")} className="flex items-center gap-1 hover:text-gray-900">
                  <span>Prompt</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                <button onClick={() => onSort("position")} className="flex items-center gap-1 hover:text-gray-900">
                  <span>Position</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                <button onClick={() => onSort("sentiment")} className="flex items-center gap-1 hover:text-gray-900">
                  <span>Sentiment</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                <button onClick={() => onSort("visibility")} className="flex items-center gap-1 hover:text-gray-900">
                  <span>Visibility</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Top</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Tags</th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Location</th>
              <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                <button onClick={() => onSort("created_at")} className="flex items-center justify-center gap-1 hover:text-gray-900 w-full">
                  <span>Created</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-6 px-6">
                  <div className="animate-pulse h-5 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="animate-pulse h-5 bg-gray-200 rounded w-1/2" />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-gray-500">
                  No prompts found.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50 hover:bg-gray-25 cursor-pointer"
                  onClick={() => onRowClick(p.id)}
                >
                  <td className="py-4 px-6">
                    <p className="text-sm text-gray-900 font-medium line-clamp-2">{p.prompt}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-900">
                      {p._avgPosition != null ? p._avgPosition.toFixed(1) : "—"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <SentimentPill n={p._avgSentiment01} />
                  </td>
                  <td className="py-4 px-4">
                    <VisibilityBar pct={p._visibilityPct} />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex -space-x-2">
                      <div className="h-6 w-6 rounded-full bg-gray-200 border border-white" />
                      <div className="h-6 w-6 rounded-full bg-gray-300 border border-white" />
                      <div className="h-6 w-6 rounded-full bg-gray-400 border border-white" />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {p.topic ? (
                      <Badge variant="secondary" className="text-2xs">
                        {p.topic}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-sm text-gray-500">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
