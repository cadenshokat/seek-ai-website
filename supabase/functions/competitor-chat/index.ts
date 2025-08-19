import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { competitorId, message } = await req.json();
    
    if (!competitorId || !message) {
      throw new Error('Competitor ID and message are required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching competitor details for:', competitorId);

    // Fetch competitor details
    const { data: competitor, error: competitorError } = await supabase
      .from('competitors')
      .select('*')
      .eq('id', competitorId)
      .single();

    if (competitorError) {
      console.error('Error fetching competitor:', competitorError);
      throw competitorError;
    }

    // Fetch competitor mentions for context
    const { data: mentions, error: mentionsError } = await supabase
      .from('competitor_mentions')
      .select('*')
      .eq('competitor_id', competitorId)
      .order('date', { ascending: false })
      .limit(10);

    if (mentionsError) {
      console.error('Error fetching mentions:', mentionsError);
    }

    // Prepare context for OpenAI
    const context = `
    Competitor Analysis Request for: ${competitor.name}
    
    Competitor Details:
    - Name: ${competitor.name}
    - Website: ${competitor.website || 'Unknown'}
    
    Recent Mentions Context:
    ${mentions?.map(m => `- ${m.sentence_mentioned} (Sentiment: ${m.sentiment}, Position: ${m.position})`).join('\n') || 'No recent mentions available'}
    
    User Question: ${message}
    
    Please provide a comprehensive analysis of this competitor. Include details about:
    - Key features and differentiators
    - Market positioning
    - Competitive advantages
    - Recent developments or trends
    - Strategic insights
    
    Format your response in a clear, structured way with appropriate sections and bullet points.
    `;

    console.log('Sending request to OpenAI with context length:', context.length);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive intelligence analyst. Provide detailed, insightful analysis about competitors based on the available data. Be thorough, professional, and strategic in your analysis.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response generated from OpenAI');
    }

    console.log('Generated response length:', aiResponse.length);

    // Store the chat message and response
    const { error: insertError } = await supabase
      .from('competitor_chats')
      .insert({
        competitor_id: competitorId,
        message: message,
        response: aiResponse
      });

    if (insertError) {
      console.error('Error storing chat:', insertError);
      // Don't throw here, just log the error
    }

    return new Response(JSON.stringify({
      response: aiResponse,
      competitorName: competitor.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});