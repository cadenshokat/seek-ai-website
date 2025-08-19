-- Create workspace table
CREATE TABLE public.workspace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'My Workspace',
  domain TEXT,
  ip_address TEXT,
  country_code TEXT DEFAULT 'US',
  country_name TEXT DEFAULT 'United States',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workspace_models table for model configurations
CREATE TABLE public.workspace_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  model_name TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, model_name)
);

-- Enable RLS
ALTER TABLE public.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_models ENABLE ROW LEVEL SECURITY;

-- Create policies for workspace
CREATE POLICY "Anyone can view workspace" 
ON public.workspace 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create workspace" 
ON public.workspace 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update workspace" 
ON public.workspace 
FOR UPDATE 
USING (true);

-- Create policies for workspace_models
CREATE POLICY "Anyone can view workspace models" 
ON public.workspace_models 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create workspace models" 
ON public.workspace_models 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update workspace models" 
ON public.workspace_models 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete workspace models" 
ON public.workspace_models 
FOR DELETE 
USING (true);

-- Create trigger for workspace timestamps
CREATE TRIGGER update_workspace_updated_at
BEFORE UPDATE ON public.workspace
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for workspace_models timestamps
CREATE TRIGGER update_workspace_models_updated_at
BEFORE UPDATE ON public.workspace_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default workspace
INSERT INTO public.workspace (name, domain, country_code, country_name) 
VALUES ('Hear.com', 'hear.com', 'US', 'United States');

-- Get the workspace ID for default models
DO $$
DECLARE
    workspace_uuid UUID;
BEGIN
    SELECT id INTO workspace_uuid FROM public.workspace LIMIT 1;
    
    -- Insert default models
    INSERT INTO public.workspace_models (workspace_id, model_name, model_provider, is_enabled, icon) VALUES
    (workspace_uuid, 'ChatGPT', 'OpenAI', true, '🤖'),
    (workspace_uuid, 'GPT 4o Search', 'OpenAI', false, '🔍'),
    (workspace_uuid, 'Perplexity', 'Perplexity', true, '🔮'),
    (workspace_uuid, 'AI Overview', 'Google', true, '📊'),
    (workspace_uuid, 'Gemini 2.5 Flash', 'Google', false, '💎'),
    (workspace_uuid, 'Claude Sonnet 4', 'Anthropic', false, '🎭'),
    (workspace_uuid, 'DeepSeek R1', 'DeepSeek', false, '🧠'),
    (workspace_uuid, 'Llama', 'Meta', false, '🦙'),
    (workspace_uuid, 'Grok', 'xAI', false, '⚡');
END $$;