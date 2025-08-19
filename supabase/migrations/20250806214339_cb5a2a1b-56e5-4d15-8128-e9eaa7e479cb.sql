-- Create table for prompt chats
CREATE TABLE public.prompt_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'succeeded',
  model_provider TEXT NOT NULL DEFAULT 'ChatGPT',
  country TEXT NOT NULL DEFAULT 'United States',
  citations_count INTEGER NOT NULL DEFAULT 0,
  mentions_count INTEGER NOT NULL DEFAULT 0,
  sources_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chat sources relationship
CREATE TABLE public.chat_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.prompt_chats(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chat citations
CREATE TABLE public.chat_citations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.prompt_chats(id) ON DELETE CASCADE,
  citation_text TEXT NOT NULL,
  source_url TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chat brands mentioned
CREATE TABLE public.chat_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.prompt_chats(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prompt_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_brands ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Anyone can view prompt chats" ON public.prompt_chats FOR SELECT USING (true);
CREATE POLICY "Anyone can create prompt chats" ON public.prompt_chats FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prompt chats" ON public.prompt_chats FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete prompt chats" ON public.prompt_chats FOR DELETE USING (true);

CREATE POLICY "Anyone can view chat sources" ON public.chat_sources FOR SELECT USING (true);
CREATE POLICY "Anyone can create chat sources" ON public.chat_sources FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update chat sources" ON public.chat_sources FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete chat sources" ON public.chat_sources FOR DELETE USING (true);

CREATE POLICY "Anyone can view chat citations" ON public.chat_citations FOR SELECT USING (true);
CREATE POLICY "Anyone can create chat citations" ON public.chat_citations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update chat citations" ON public.chat_citations FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete chat citations" ON public.chat_citations FOR DELETE USING (true);

CREATE POLICY "Anyone can view chat brands" ON public.chat_brands FOR SELECT USING (true);
CREATE POLICY "Anyone can create chat brands" ON public.chat_brands FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update chat brands" ON public.chat_brands FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete chat brands" ON public.chat_brands FOR DELETE USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prompt_chats_updated_at
  BEFORE UPDATE ON public.prompt_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO public.prompt_chats (prompt_id, title, content, citations_count, mentions_count, sources_count) VALUES
('12345678-1234-1234-1234-123456789012', 'What is the Horizon iX?', 'The Horizon iX (pronounced "Horizon i-X") is a recently launched, high-end hearing aid developed by Hear.com in partnership with audio-technology leader Signia. (formerly part of Siemens). It''s specially designed for active adults seeking near-invisible, high-clarity hearing assistance', 9, 5, 8),
('12345678-1234-1234-1234-123456789012', 'What is the Horizon iX?', 'The Horizon iX refers to a series of advanced hearing aids by hear.com that utilize the Signia iX (Integrated Xperience) platform, which features innovative dual-processor technology', 2, 1, 6),
('12345678-1234-1234-1234-123456789012', 'What is the Horizon iX?', 'The Horizon iX refers to a line of advanced hearing aids built on the "iX" or "Integrated Xperience" platform, developed by Hear.com in collaboration with Signia. These hearing aids are', 8, 3, 10),
('12345678-1234-1234-1234-123456789012', 'What is the Horizon iX?', '## Overview The Horizon iX refers to a family of premium hearing aids developed by hear.com, built on Signia''s Integrated Xperience (iX) platform—one of the latest and most advanced', 10, 6, 6),
('12345678-1234-1234-1234-123456789012', 'What is the Horizon iX?', 'The Horizon iX (also referred to as Horizon iX) refers to a series of hearing aids developed by Hear.com, which incorporate advanced features and technologies to enhance hearing', 2, 1, 2);

-- Insert sample chat sources
INSERT INTO public.chat_sources (chat_id, source_url, source_name) VALUES
((SELECT id FROM public.prompt_chats LIMIT 1), 'www.hear.com/news/press-releases/hear-com-unveils-unprecedented-next-generation-hearing-aid-horizon-ix/', 'hear.com'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'www.hear.com/resources/hearing-aids/miracle-1', 'hear.com'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'forum.hearingtracker.com/t/horizon-ix-know-any-thing-about-them-good-bad-help-scam-or-is-it-for-mild-loss-only/88213', 'hearingtracker.com'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'www.hear.com/hearing-aids/horizon/app/', 'hear.com'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'tinnitusreatmentremedy.com/latest-horizon-ix-hearing-aid-your-solution-to-hearing-loss/', 'tinnitusreatmentremedy.com'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'deal.town/hear.com/introducing-horizon-ix-the-worlds-biggest-sound-upgrade-PKWTUZMNF', 'deal.town'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'comparemaniac.com/horizon-ix-hearing-aid/', 'comparemaniac.com');

-- Insert sample chat brands
INSERT INTO public.chat_brands (chat_id, brand_name) VALUES
((SELECT id FROM public.prompt_chats LIMIT 1), 'Hear.com'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'Signia'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'Costco'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'Phonak'),
((SELECT id FROM public.prompt_chats LIMIT 1), 'Starkey');