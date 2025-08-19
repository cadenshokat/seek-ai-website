-- Create edge function secrets for OpenAI API key
-- This will be handled in the Edge Function, but we need to create a table to store chat messages

CREATE TABLE public.competitor_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id UUID NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_chats ENABLE ROW LEVEL SECURITY;

-- Create policies for competitor chats
CREATE POLICY "Anyone can view competitor chats" 
ON public.competitor_chats 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create competitor chats" 
ON public.competitor_chats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update competitor chats" 
ON public.competitor_chats 
FOR UPDATE 
USING (true);