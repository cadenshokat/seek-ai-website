// src/components/FiltersHeader.tsx
import React, { useEffect, useState } from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { BrandDropdown } from "@/components/BrandDropdown";
import { ModelsDropdown } from "@/components/ModelsDropdown";
import { TimeRangeDropdown } from "@/components/TimeRangeDropdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Zap } from "lucide-react";

type PlatformJoin = { name?: string | null; logo?: string | null } | { name?: string | null; logo?: string | null }[] | null | undefined;

type RunHeaderRow = {
  id: string;
  run_id: string;
  run_at: string;
  status: string;
  model_id: string;
  platforms?: PlatformJoin;
};

const FallbackModelIcon = () => <Zap className="h-4 w-4 text-gray-600" />;

const extractPlatformInfo = (pl: PlatformJoin): { model_name: string; model_logo?: string | null } => {
  const pick = (obj: any) => ({ model_name: obj?.name ?? "", model_logo: obj?.logo ?? null });
  if (!pl) return { model_name: "", model_logo: null };
  return Array.isArray(pl) ? pick(pl[0] || {}) : pick(pl);
};

function ChatHeaderBar({ id, runId }: { id?: string; runId?: string }) {
  const navigate = useNavigate();
  const [row, setRow] = useState<RunHeaderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const base = supabase
          .from("runs")
          .select("id, run_id, run_at, status, model_id, platforms ( name, logo )");

        const q = id
          ? base.eq("id", id).single()
          : base.eq("run_id", String(runId)).limit(1).maybeSingle();

        const { data, error } = await q;
        if (error) throw error;
        if (!cancelled) setRow(data as RunHeaderRow);
      } catch {
        if (!cancelled) setRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, runId]);

  const runAt = row ? new Date(row.run_at).toLocaleString() : "";

  const { model_name, model_logo } = extractPlatformInfo(row?.platforms);

  return (
    <div className="flex items-center justify-between">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
        </Button>
      </div>

      {loading ? (
        <div className="flex gap-3 items-center">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
      ) : row ? (
        <div className="flex gap-3 items-center">
          <Badge variant="secondary" className="shrink-0">
            {row.status}
          </Badge>

          <div className="flex items-center gap-2 min-w-0">
            {model_logo ? (
              <img
                src={model_logo}
                alt={model_name}
                className="h-5 w-5 rounded object-contain"
                loading="lazy"
              />
            ) : (
              <FallbackModelIcon />
            )}
            <span className="text-sm text-gray-700 truncate">
              {model_name || row.run_id}
            </span>
          </div>

          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-gray-600">{runAt}</span>
        </div>
      ) : null}
    </div>
  );
}

export function FiltersHeader() {
  const matchById = useMatch("/chats/:id");
  const matchByRun = useMatch("/chats/run/:runId");

  const inChat = Boolean(matchById || matchByRun);
  const id = matchById?.params.id;
  const runId = matchByRun?.params.runId;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {inChat ? (
        <ChatHeaderBar id={id} runId={runId} />
      ) : (
        <div className="flex items-center space-x-4">
          <BrandDropdown />
          <ModelsDropdown />
          <TimeRangeDropdown />
        </div>
      )}
    </div>
  );
}
