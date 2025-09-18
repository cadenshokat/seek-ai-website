import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNavigate } from "react-router-dom";
import { Search, Zap } from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useTimeRange } from "@/hooks/useTimeRange";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Chat {
  id: string;
  run_id: string;
  response: string;
  prompt_id: string;
  model_id: string;
  run_at: string;
  status: string;
}

type PromptJoin =
  | { prompt: string }
  | { prompt: string }[]
  | null
  | undefined;

type PlatformJoin =
  | { name?: string | null; logo?: string | null;}
  | { name?: string | null; logo?: string | null }[]
  | null
  | undefined;

type SupaRunRow = Chat & {
  prompts?: PromptJoin;
  platforms?: PlatformJoin; 
};

type ChatRow = Chat & {
  prompt_text: string;
  model_name: string;       
  model_logo?: string | null; 
};

const collapseExtraNewlines = (s: string): string =>
  s.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n");

const stripMdFence = (s: string): string => {
  if (!s) return "";
  let t = s.trim();
  t = t.replace(/^```[a-zA-Z0-9_-]*\s*\n/, "");
  t = t.replace(/\n?```$/, "");
  t = collapseExtraNewlines(t);
  return t.trim();
};

const wrapAsMdFence = (s: string): string => "```markdown\n" + stripMdFence(s) + "\n```";

const firstLines = (s: string, n = 3): string => {
  const lines = stripMdFence(s).split(/\r?\n/).slice(0, n);
  return wrapAsMdFence(lines.join("\n"));
};

const toISO = (d: Date) => new Date(d).toISOString();

const FallbackModelIcon = () => <Zap className="h-4 w-4 text-gray-600" />;

const extractPromptText = (p: PromptJoin): string => {
  if (!p) return "(untitled prompt)";
  if (Array.isArray(p)) return p[0]?.prompt ?? "(untitled prompt)";
  return p.prompt ?? "(untitled prompt)";
};

const extractPlatformInfo = (pl: PlatformJoin): { model_name: string; model_logo?: string | null } => {
  const pick = (obj: any) => {
    const name = obj?.name ?? "";
    const logo = obj?.logo ?? null;
    return { model_name: name || "", model_logo: logo };
  };

  if (!pl) return { model_name: "", model_logo: null };
  if (Array.isArray(pl)) return pick(pl[0] || {});
  return pick(pl);
};

export function Chats() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedRange } = useTimeRange();
  const { selectedModel } = useModels();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const startISO = toISO(selectedRange.start);
        const endISO = toISO(selectedRange.end);

        let q = supabase
          .from("runs")
          .select(
            "id, run_id, response, prompt_id, model_id, run_at, status, " +
            "prompts ( prompt ), " +
            "platforms ( name, logo )"
          )
          .order("run_at", { ascending: false })
          .gte("run_at", startISO)
          .lte("run_at", endISO);

        if (selectedModel) {
          q = q.eq("model_id", selectedModel);
        }

        const { data, error } = await q;
        if (error) throw error;

        const mapped: ChatRow[] = ((data ?? []) as any[]).map((r: SupaRunRow & any) => {
          const prompt_text = extractPromptText(r.prompts);
          const { model_name, model_logo } = extractPlatformInfo(r.platforms);

          const row: ChatRow = {
            id: String(r.id),
            run_id: String(r.run_id),
            response: String(r.response ?? ""),
            prompt_id: String(r.prompt_id),
            model_id: String(r.model_id),
            run_at: String(r.run_at),
            status: String(r.status ?? "unknown"),
            prompt_text,
            model_name: model_name || String(r.model_id), // fall back to model_id if name missing
            model_logo: model_logo ?? null,
          };
          return row;
        });

        setRows(mapped);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Failed to load chats",
          description: e?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRange, selectedModel, toast]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.prompt_text, r.response, r.model_name, r.model_id].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ad = new Date(a.run_at).getTime();
      const bd = new Date(b.run_at).getTime();
      return sortBy === "newest" ? bd - ad : ad - bd;
    });
    return arr;
  }, [filtered, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by prompt, response, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-86"
            />
          </div>

          <Select value={sortBy} onValueChange={(v: "newest" | "oldest") => setSortBy(v)}>
            <SelectTrigger className="w-36">
              <SelectValue>{sortBy === "newest" ? "Newest" : "Oldest"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg bg-white">
  {sorted.map((r, idx) => {
    const preview = firstLines(r.response || "", 3); 
    const runAt = new Date(r.run_at).toLocaleString();

    return (
      <React.Fragment key={r.id}>
        <div
          role="button"
          className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => navigate(`/chats/${r.id}`)}
        >
          <div className="flex w-full items-start gap-3">
            <div className="flex-none align-center items-center">
              {r.model_logo ? (
                <img
                  src={r.model_logo}
                  alt={r.model_name}
                  className="h-5 w-5 rounded object-contain"
                  loading="lazy"
                />
              ) : (
                <FallbackModelIcon />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div
                  className="text-gray-900 font-bold min-w-0 truncate text-sm"
                  title={r.prompt_text}
                >
                  {r.prompt_text}
                </div>
                <time className="ml-auto shrink-0 whitespace-nowrap text-gray-700 text-xs">
                  {runAt}
                </time>
              </div>

              <div
                className="mt-1 prose prose-sm max-w-none break-words text-sm
                           prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:overflow-hidden
                           prose-code:break-words prose-code:whitespace-pre-wrap"
                style={{ overflowWrap: "anywhere" }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {preview}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {idx < sorted.length - 1 && <div className="h-px bg-gray-200" />}
      </React.Fragment>
    );
  })}

  {!loading && sorted.length === 0 && (
    <div className="px-4 py-12 text-center text-gray-500">
      No chats found. Adjust your filters or time range.
    </div>
  )}

  {loading && (
    <div className="py-8 text-center text-gray-600">Loading chats…</div>
  )}
</div>

    </div>
  );
}
