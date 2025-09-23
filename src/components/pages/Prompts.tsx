import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useBrands } from "@/hooks/useBrands";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";
import { useToast } from "@/hooks/use-toast";
import { buildPromptMetrics, BuiltMetrics } from "@/lib/promptMetrics";

interface PromptRow {
  id: string;
  prompt: string;
  topic?: string | null;
  is_active: boolean;
  created_at: string | null;
  brand_id?: string | null;
  active?: string | null;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

type TabKey = "active" | "inactive" | "suggested";
type SortKey = "prompt" | "created_at" | "position" | "sentiment" | "visibility";
type SortDir = "asc" | "desc";

export type PMRow = {
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
  _topBrands?: { id: string; name: string; logo?: string | null; color?: string | null; mentions: number; sharePct: number }[];
};

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function classNames(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export function Prompts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedBrand, getBrandOptions } = useBrands();
  const { selectedModel } = useModels();
  const { selectedRange } = useTimeRange();

  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [metricsByPrompt, setMetricsByPrompt] = useState<BuiltMetrics>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ prompt: "", topic: "", is_active: true });
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [tags, setTags] = useState<Tag[]>([]);
  const [tagsManagerOpen, setTagsManagerOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#10b981");
  const [savingTag, setSavingTag] = useState(false);

  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

const togglePromptActive = async (id: string, isActive: boolean) => {
    setTogglingIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    try {
      const { error } = await supabase.from("prompts").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;

      setPrompts(prev => {
        let next = prev.map(p => (p.id === id ? { ...p, is_active: isActive } : p));
        if (activeTab === "active") next = next.filter(p => p.is_active);
        if (activeTab === "inactive") next = next.filter(p => !p.is_active);
        return next;
      });

      toast({
        title: isActive ? "Activated" : "Deactivated",
        description: `Prompt is now ${isActive ? "active" : "inactive"}.`
      });
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const loadTags = async () => {
    const { data, error } = await supabase.from("tags").select("*").order("name", { ascending: true });
    if (error) {
      toast({ title: "Error", description: "Failed to load tags.", variant: "destructive" });
      return;
    }
    setTags((data || []) as Tag[]);
  };

  const upsertTag = async (name: string, color?: string) => {
    const { data, error } = await supabase
      .from("tags")
      .upsert({ name: name.trim(), color: color?.trim() || "#10b981" }, { onConflict: "name" })
      .select("*")
      .single();
    if (error) throw error;
    return data as Tag;
  };

  const deleteTag = async (tagId: string, tagName: string) => {
    const { error: upErr } = await supabase.from("prompts").update({ topic: null }).eq("topic", tagName);
    if (upErr) {
      toast({ title: "Error", description: "Failed to clear tag from prompts.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete tag.", variant: "destructive" });
      return;
    }
    await loadTags();
    refreshPrompts();
    toast({ title: "Deleted", description: `Tag “${tagName}” removed.` });
  };

  const assignTagToPrompt = async (promptId: string, tagName: string | null) => {
    try {
      if (tagName && tagName.trim() !== "") {
        await upsertTag(tagName);
      }
      const { error } = await supabase.from("prompts").update({ topic: tagName }).eq("id", promptId);
      if (error) throw error;
      setPrompts((prev) =>
        prev.map((p) => (p.id === promptId ? { ...p, topic: tagName } : p))
      );
      await loadTags();
      toast({ title: "Saved", description: tagName ? `Tag “${tagName}” applied.` : "Tag removed." });
    } catch {
      toast({ title: "Error", description: "Could not update tag.", variant: "destructive" });
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  const refreshPrompts = async () => {
    setLoading(true);
    try {
      let q = supabase.from("prompts").select("*").order("created_at", { ascending: false });
      if (activeTab === "active") q = q.eq("is_active", true);
      if (activeTab === "inactive") q = q.eq("is_active", false);
      const { data, error } = await q;
      if (error) throw error;
      setPrompts(data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load prompts", variant: "destructive" });
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPrompts();
  }, [activeTab]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const start = toISODate(selectedRange.start);
        const end = toISODate(selectedRange.end);
        let q = supabase
          .from("prompt_mentions")
          .select("day,prompt_id,model_id,entity_type,entity_id,mention_count,avg_position,avg_sentiment_score")
          .gte("day", start)
          .lte("day", end);
        if (selectedModel) q = q.eq("model_id", selectedModel);
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data || []) as PMRow[];
        const built = buildPromptMetrics(rows, selectedBrand, getBrandOptions);
        setMetricsByPrompt(built);
      } catch {
        setMetricsByPrompt({});
      }
    };
    fetchMetrics();
  }, [selectedBrand, selectedModel, selectedRange, getBrandOptions]);

  const rowsWithMetrics: PromptWithMetrics[] = useMemo(() => {
    return prompts.map((p) => {
      const m = metricsByPrompt[p.id];
      return {
        ...p,
        _mentionCount: m?.mentionCountBrand ?? 0,
        _avgPosition: m?.avgPosition ?? null,
        _avgSentiment01: m?.avgSentiment01 ?? null,
        _visibilityPct: m?.visibilityPct ?? 0,
        _topBrands: m?.topBrands ?? [],
      };
    });
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
    else {
      setSortKey(key);
      setSortDir(key === "prompt" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Prompt */}
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
                <Label htmlFor="topic">Tags</Label>
                <Input
                  id="topic"
                  value={newPrompt.topic}
                  onChange={(e) => setNewPrompt({ ...newPrompt, topic: e.target.value })}
                  placeholder="Enter tags"
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
                <Button
                  onClick={async () => {
                    if (!newPrompt.prompt.trim())
                      return toast({ title: "Prompt required", description: "Please enter a prompt." });
                    try {
                      const topicName = newPrompt.topic?.trim() || null;
                      if (topicName) await upsertTag(topicName);

                      const payload: Partial<PromptRow> = {
                        prompt: newPrompt.prompt.trim(),
                        topic: topicName,
                        is_active: newPrompt.is_active,
                        brand_id: selectedBrand || null,
                      };
                      const { data, error } = await supabase.from("prompts").insert(payload).select("*").single();
                      if (error) throw error;
                      setPrompts((prev) => [data as PromptRow, ...prev]);
                      setIsAddDialogOpen(false);
                      setNewPrompt({ prompt: "", topic: "", is_active: true });
                      await loadTags();
                      toast({ title: "Added", description: "New prompt created." });
                    } catch {
                      toast({ title: "Error", description: "Failed to add prompt", variant: "destructive" });
                    }
                  }}
                >
                  Add Prompt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tags Manager trigger (also duplicated in table header via pencil icon) */}
        <Button variant="outline" onClick={() => setTagsManagerOpen(true)}>
          Manage Tags
        </Button>
      </div>

      {/* Tags Manager Dialog */}
      <Dialog open={tagsManagerOpen} onOpenChange={setTagsManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tags Manager</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="tagName">New tag name</Label>
                <Input
                  id="tagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Awareness, Bottom-of-funnel"
                  className="mt-1"
                />
              </div>
              <div className="w-40">
                <Label htmlFor="tagColor">Color</Label>
                <Input
                  id="tagColor"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="mt-1 h-10"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={!newTagName.trim() || savingTag}
                onClick={async () => {
                  try {
                    setSavingTag(true);
                    await upsertTag(newTagName, newTagColor);
                    setNewTagName("");
                    setNewTagColor("#10b981");
                    await loadTags();
                    toast({ title: "Saved", description: "Tag added." });
                  } catch {
                    toast({ title: "Error", description: "Failed to save tag.", variant: "destructive" });
                  } finally {
                    setSavingTag(false);
                  }
                }}
              >
                {savingTag ? "Saving..." : "Add Tag"}
              </Button>
            </div>

            <div>
              <Label className="mb-2 block">All tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-sm text-gray-500">No tags yet.</span>
                ) : (
                  tags.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-full border px-3 py-1"
                      style={{ borderColor: t.color || "#e5e7eb" }}
                    >
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-sm">{t.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTag(t.id, t.name)}
                        title="Delete tag"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsContent value="active" className="mt-6">
          <PromptTable
            loading={loading}
            rows={promptsSorted}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onRowClick={(id) => navigate(`/prompts/${id}`)}
            tags={tags}
            onAssignTag={assignTagToPrompt}
            onOpenTagsManager={() => setTagsManagerOpen(true)}
            onToggleActive={togglePromptActive}
            togglingIds={togglingIds}

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
            tags={tags}
            onAssignTag={assignTagToPrompt}
            onOpenTagsManager={() => setTagsManagerOpen(true)}
            onToggleActive={togglePromptActive}
            togglingIds={togglingIds}

          />
        </TabsContent>

        <TabsContent value="suggested" className="mt-6">
          <div className="text-sm text-gray-500">Suggested prompts coming soon.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SentimentPill({ n }: { n: number | null | undefined }) {
  if (n == null) return <span>—</span>;
  const bgClass =
    n >= 90 ? "bg-[#86efac]"
      : n >= 70 ? "bg-[#bef264]"
      : n >= 50 ? "bg-[#fde047]"
      : n >= 30 ? "bg-[#fdba74]"
      : "bg-[#fca5a5]";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${bgClass}`} />
      {n}
    </span>
  );
}

function visibilityColorClass(v: number) {
  // mirrors SentimentPill thresholds
  return v >= 90 ? "bg-[#86efac]"
    : v >= 70 ? "bg-[#bef264]"
    : v >= 50 ? "bg-[#fde047]"
    : v >= 20 ? "bg-[#fdba74]"
    : "bg-[#fca5a5]";
}

function VisibilityBar({
  pct,
  segments = 10,
  emptyClass = "bg-gray-200",
}: {
  pct: number | undefined;
  segments?: number;
  emptyClass?: string;
}) {
  const v = Math.max(0, Math.min(100, pct ?? 0));

  // Use ceil so 34% -> 4 of 10; ensure >0% shows at least 1 bar, but 0% shows 0.
  const filled = v === 0 ? 0 : Math.max(1, Math.ceil((v / 100) * segments));

  const filledClass = visibilityColorClass(v);
  const blocks = Array.from({ length: segments }, (_, i) => i < filled);

  return (
    <div
      className="flex items-center gap-2 min-w-[150px]"
      title={`${v.toFixed(0)}% visibility`}
      aria-label={`Visibility ${v.toFixed(0)} percent`}
    >
      <div className="flex gap-1">
        {blocks.map((isFilled, idx) => (
          <div
            key={idx}
            className={classNames(
              "h-3 w-2 rounded-sm transition-colors",
              isFilled ? filledClass : emptyClass
            )}
          />
        ))}
      </div>
      <span className="text-sm text-gray-700">{v.toFixed(0)}%</span>
    </div>
  );
}


function TopBrandsCell({ items }: { items: NonNullable<PromptWithMetrics["_topBrands"]> }) {
  return (
    <div className="flex -space-x-2">
      {items.slice(0, 3).map((b, i) =>
        b.logo ? (
          <img key={b.id + i} src={b.logo} alt={b.name} className="h-6 w-6 rounded-full border border-white object-contain bg-white" />
        ) : (
          <div key={b.id + i} className="h-6 w-6 rounded-full border border-white" style={{ backgroundColor: b.color || "#e5e7eb" }} />
        )
      )}
    </div>
  );
}

function TagBadge({
  label,
  color,
  empty = false,
  className = "",
}: { label?: string | null; color?: string; empty?: boolean; className?: string }) {
  if (empty) {
    return (
      <span
        className={classNames(
          "inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50",
          "transition-colors cursor-pointer", className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
        Add tag
      </span>
    );
  }
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800 hover:bg-gray-200",
        "transition-colors cursor-pointer", className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color || "#10b981" }} />
      {label}
    </span>
  );
}

function TagBadgeDropdown({
  value,
  tags,
  onChange,
  onOpenNew,
  disabled,
}: {
  value: string | null;
  tags: { id: string; name: string; color: string }[];
  onChange: (val: string | null) => void;
  onOpenNew: () => void;
  disabled?: boolean;
}) {
  const current = value ? tags.find(t => t.name === value) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {/* Badge as the trigger */}
        <div onClick={(e) => e.stopPropagation()}>
          {current ? (
            <TagBadge label={current.name} color={current.color} />
          ) : (
            <TagBadge empty />
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[220px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs text-gray-500">Select a tag</DropdownMenuLabel>
        {tags.length === 0 ? (
          <DropdownMenuItem onClick={onOpenNew}>+ New tag…</DropdownMenuItem>
        ) : (
          <>
            {tags.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onClick={async () => onChange(t.name)}
                className="flex items-center gap-2"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-sm">{t.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenNew}>+ New tag…</DropdownMenuItem>
            {current && (
              <DropdownMenuItem onClick={async () => onChange(null)}>
                Remove tag
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PromptTable({
  loading,
  rows,
  onSort,
  onRowClick,
  tags,
  onAssignTag,
  onOpenTagsManager,
  onToggleActive,
  togglingIds,
}: {
  loading: boolean;
  rows: PromptWithMetrics[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  onRowClick: (id: string) => void;
  tags: Tag[];
  onAssignTag: (promptId: string, tagName: string | null) => void;
  onOpenTagsManager: () => void;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
  togglingIds: Set<string>;
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
                  <span>Visibility %</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">Top</th>

              {/* Tags header with pencil */}
              <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                <div className="flex items-center gap-2">
                  <span>Tags</span>
                  <button
                    className="rounded p-1 hover:bg-gray-100"
                    title="Manage tags"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTagsManager();
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </th>

              <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                <button onClick={() => onSort("created_at")} className="flex items-center justify-center gap-1 hover:text-gray-900 w-full">
                  <span>Created</span>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>

              <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">Active</th>
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
                <td colSpan={8} className="py-10 text-center text-gray-500">No prompts found.</td>
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
                    <span className="text-sm text-gray-900">{p._avgPosition != null ? p._avgPosition.toFixed(1) : "—"}</span>
                  </td>
                  <td className="py-4 px-4">
                    <SentimentPill n={p._avgSentiment01} />
                  </td>
                  <td className="py-4 px-4">
                    <VisibilityBar pct={p._visibilityPct} />
                  </td>
                  <td className="py-4 px-4">
                    {p._topBrands && p._topBrands.length > 0 ? <TopBrandsCell items={p._topBrands} /> : <span className="text-sm text-gray-400">—</span>}
                  </td>

                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <TagBadgeDropdown
                      value={p.topic ?? null}
                      tags={tags}
                      onChange={async (val) => {
                        await onAssignTag(p.id, val);
                      }}
                      onOpenNew={onOpenTagsManager}
                    />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-sm text-gray-500">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</span>
                  </td>

                  <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center justify-center">
                      <Switch
                        checked={p.is_active}
                        onCheckedChange={(checked) => onToggleActive(p.id, checked)}
                        disabled={togglingIds.has(p.id)}
                        aria-label={p.is_active ? "Set inactive" : "Set active"}
                      />
                    </div>
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
