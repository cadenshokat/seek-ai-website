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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Exporting chat history...');

    // Fetch all competitor chat data
    const { data: competitorChats, error: competitorError } = await supabase
      .from('competitor_chats')
      .select(`
        *,
        competitors(name, website)
      `)
      .order('created_at', { ascending: false });

    if (competitorError) {
      console.error('Error fetching competitor chats:', competitorError);
      throw competitorError;
    }

    // Prepare the export data
    const exportData = {
      export_metadata: {
        export_date: new Date().toISOString(),
        total_messages: competitorChats?.length || 0,
        export_type: 'complete_chat_history'
      },
      competitor_chats: competitorChats?.map(chat => ({
        id: chat.id,
        competitor_name: chat.competitors?.name || 'Unknown',
        competitor_website: chat.competitors?.website || null,
        user_message: chat.message,
        ai_response: chat.response,
        created_at: chat.created_at,
        message_length: chat.message.length,
        response_length: chat.response?.length || 0
      })) || [],
      summary: {
        total_conversations: competitorChats?.length || 0,
        date_range: {
          earliest: competitorChats?.[competitorChats.length - 1]?.created_at || null,
          latest: competitorChats?.[0]?.created_at || null
        },
        unique_competitors: [...new Set(competitorChats?.map(chat => chat.competitors?.name).filter(Boolean))] || []
      }
    };

    console.log(`Exported ${exportData.competitor_chats.length} chat messages`);

    // Return the JSON data
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="chat-history-${new Date().toISOString().split('T')[0]}.json"`
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Failed to export chat history'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});