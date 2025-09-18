import { supabase } from "@/integrations/supabase/client";

export async function getRunUuidByTrip(args: {
  run_id?: string | null;
  model_id?: string | null;
  prompt_id?: string | null;
}): Promise<string | null> {
  const { run_id, model_id, prompt_id } = args;
  if (!run_id || !model_id) return null;

  if (prompt_id) {
    const { data, error } = await supabase
      .from("runs")
      .select("id")
      .eq("run_id", run_id)
      .eq("model_id", model_id)
      .eq("prompt_id", prompt_id)
      .limit(1)
      .single();

    if (error) return null;
    return data?.id ?? null;
  }

  const { data, error } = await supabase
    .from("runs")
    .select("id")
    .eq("run_id", run_id)
    .eq("model_id", model_id)
    .order("run_at", { ascending: false })
    .limit(1);

  if (error || !data?.[0]) return null;
  return data[0].id;
}
