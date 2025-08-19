import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface CompetitorChatProps {
  competitorId: string;
  competitorName: string;
}

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  created_at: string;
}

const SUGGESTED_QUESTIONS = [
  "What are the key features and differentiators?",
  "How do they position themselves in the market?",
  "What are their competitive advantages?",
  "What recent developments should I know about?",
  "How do they compare to industry leaders?",
  "What is their pricing strategy?"
];

export function CompetitorChat({ competitorId, competitorName }: CompetitorChatProps) {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatHistory();
  }, [competitorId]);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('competitor_chats')
        .select('*')
        .eq('competitor_id', competitorId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setChatHistory(data || []);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || message;
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('competitor-chat', {
        body: {
          competitorId,
          message: textToSend
        }
      });

      if (error) throw error;

      const newChat: ChatMessage = {
        id: Date.now().toString(),
        message: textToSend,
        response: data.response,
        created_at: new Date().toISOString()
      };

      setChatHistory(prev => [newChat, ...prev]);

      toast({
        title: "Analysis Complete",
        description: `Generated comprehensive analysis for ${competitorName}`,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to analyze competitor',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatResponse = (response: string) => {
    // Split by double newlines to create paragraphs
    const paragraphs = response.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      // Check if it's a header (starts with #, *, or is short and ends with :)
      if (paragraph.startsWith('#') || paragraph.startsWith('*') || 
          (paragraph.length < 100 && paragraph.endsWith(':'))) {
        return (
          <h3 key={index} className="font-semibold text-gray-900 mt-4 mb-2 first:mt-0">
            {paragraph.replace(/^[#*]\s*/, '')}
          </h3>
        );
      }
      
      // Check if it's a bullet point
      if (paragraph.startsWith('-') || paragraph.startsWith('•')) {
        const items = paragraph.split('\n').filter(item => item.trim());
        return (
          <ul key={index} className="list-disc list-inside space-y-1 mb-4">
            {items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">
                {item.replace(/^[-•]\s*/, '')}
              </li>
            ))}
          </ul>
        );
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-gray-700 mb-4 leading-relaxed">
          {paragraph}
        </p>
      );
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chat Input */}
      <Card className="p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h3 className="font-medium">AI Competitor Analysis</h3>
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder={`Ask anything about ${competitorName}...`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            disabled={loading}
            className="flex-1"
          />
          <Button 
            onClick={() => sendMessage()}
            disabled={loading || !message.trim()}
            size="sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Suggested Questions */}
        {chatHistory.length === 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-gray-50 text-xs"
                  onClick={() => sendMessage(question)}
                >
                  {question}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Chat History */}
      <div className="space-y-4">
        {chatHistory.length > 0 ? (
          chatHistory.map((chat) => (
            <Card key={chat.id} className="p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    Question
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {formatDate(chat.created_at)}
                  </span>
                </div>
                <p className="text-gray-800 font-medium">{chat.message}</p>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <Badge variant="secondary" className="text-xs">
                    AI Analysis
                  </Badge>
                </div>
                <div className="prose prose-sm max-w-none">
                  {formatResponse(chat.response)}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">
              Start your competitor analysis
            </h3>
            <p className="text-gray-600 text-sm">
              Ask any question about {competitorName} to get detailed AI-powered insights
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}