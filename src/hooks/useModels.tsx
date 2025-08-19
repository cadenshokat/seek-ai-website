import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Model {
  id: string;
  name: string;
  model?: string;
  logo?: string;
}

interface ModelsContextValue {
  models: Model[];
  selectedModel: string | null;
  setSelectedModel: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  getSelectedModelName: () => string;
}

const ModelsContext = createContext<ModelsContextValue | undefined>(undefined);

export function ModelsProvider({ children }: { children: ReactNode }) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchModels() {
      try {
        setLoading(true);

        const { data: ws, error: wsError } = await supabase
          .from("workspace")
          .select("id")
          .single();

        if (wsError) throw wsError;

        const { data, error } = await supabase
          .from("workspace_models")
          .select("id, model_name, icon, is_enabled, workspace_id")
          .eq("workspace_id", ws.id)
          .eq("is_enabled", true)
          .order("model_name");

        if (error) throw error;

        const mapped: Model[] = (data || []).map((m: any) => ({
          id: m.id as string,
          name: m.model_name as string,
          logo: m.icon || undefined,
        }));

        setModels(mapped);

        // Keep selection if still valid; else reset to All (null)
        setSelectedModel((current) =>
          current && !mapped.some((mm) => mm.id === current) ? null : current
        );

        // Realtime to reflect toggles
        if (!channel) {
          channel = supabase
            .channel("workspace_models_changes")
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "workspace_models" },
              (payload) => {
                const newWs = (payload as any).new?.workspace_id;
                const oldWs = (payload as any).old?.workspace_id;
                if (newWs === ws.id || oldWs === ws.id) {
                  fetchModels();
                }
              }
            )
            .subscribe();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch models");
      } finally {
        setLoading(false);
      }
    }

    fetchModels();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const getSelectedModelName = (): string => {
    if (!selectedModel) return "All Models";
    const m = models.find((x) => x.id === selectedModel);
    return m?.name || "Unknown Model";
  };

  const value: ModelsContextValue = {
    models,
    selectedModel,
    setSelectedModel,
    loading,
    error,
    getSelectedModelName,
  };

  return <ModelsContext.Provider value={value}>{children}</ModelsContext.Provider>;
}

export function useModels(): ModelsContextValue {
  const ctx = useContext(ModelsContext);
  if (!ctx) throw new Error("useModels must be used within a ModelsProvider");
  return ctx;
}
