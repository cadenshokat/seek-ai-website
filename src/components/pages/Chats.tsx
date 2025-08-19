import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MessageSquare, User, Zap, Plus, Search, Filter, ArrowUpDown, Clock, Globe, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Chat {
  id: string;
  title: string;
  content: string;
  prompt_id: string;
  model_provider: string;
  country: string;
  status: 'succeeded' | 'failed' | 'pending';
  created_at: string;
  updated_at: string;
  mentions_count: number;
  sources_count: number;
  citations_count: number;
}

const SAMPLE_CHATS: Chat[] = [
  {
    id: '1',
    title: 'Monthly payment plans for high-end hearing devices',
    content: 'Looking into affordable monthly payment options for premium hearing aids, specifically for devices over $3000. What financing options are available?',
    prompt_id: '1',
    model_provider: 'ChatGPT',
    country: 'United States',
    status: 'succeeded',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    mentions_count: 3,
    sources_count: 5,
    citations_count: 7
  },
  {
    id: '2',
    title: 'Insurance coverage for hearing care and devices',
    content: 'Does my health insurance cover hearing aids and audiologist visits? What about Medicare coverage for hearing devices?',
    prompt_id: '2',
    model_provider: 'Claude',
    country: 'United States',
    status: 'succeeded',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    mentions_count: 2,
    sources_count: 4,
    citations_count: 6
  },
  {
    id: '3',
    title: 'Choosing between OTC and prescription hearing aids',
    content: 'What are the main differences between over-the-counter and prescription hearing aids? Which is better for mild hearing loss?',
    prompt_id: '3',
    model_provider: 'Gemini',
    country: 'United States',
    status: 'succeeded',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    mentions_count: 1,
    sources_count: 3,
    citations_count: 4
  },
  {
    id: '4',
    title: 'Best hearing aid brands for severe hearing loss',
    content: 'Which hearing aid manufacturers offer the most powerful devices for severe to profound hearing loss? Looking for recommendations.',
    prompt_id: '4',
    model_provider: 'ChatGPT',
    country: 'United States',
    status: 'succeeded',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    mentions_count: 4,
    sources_count: 6,
    citations_count: 8
  },
  {
    id: '5',
    title: 'Top-rated hearing specialists with payment plans',
    content: 'Looking for highly rated audiologists in my area that offer financing options for hearing aids and treatment.',
    prompt_id: '5',
    model_provider: 'Claude',
    country: 'United States',
    status: 'failed',
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    mentions_count: 0,
    sources_count: 2,
    citations_count: 1
  },
  {
    id: '6',
    title: 'Hearing aids for noisy environments',
    content: 'Which hearing aids work best in restaurants, crowded spaces, and noisy work environments? Need noise reduction features.',
    prompt_id: '6',
    model_provider: 'Gemini',
    country: 'United States',
    status: 'succeeded',
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    mentions_count: 2,
    sources_count: 4,
    citations_count: 5
  }
];

export function Chats() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>(SAMPLE_CHATS);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('last-7-days');
  const [selectedModel, setSelectedModel] = useState('all-models');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const { toast } = useToast();

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('prompt_chats')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // For now, use sample data since we don't have real data yet
      // setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch chats",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Succeeded</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getModelIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'chatgpt':
        return '🤖';
      case 'claude':
        return '🧠';
      case 'gemini':
        return '💎';
      default:
        return '🤖';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'just now';
    if (diffInHours < 24) return `${diffInHours} hr. ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const filteredChats = chats.filter(chat => {
    if (searchQuery && !chat.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !chat.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedModel !== 'all-models' && chat.model_provider.toLowerCase() !== selectedModel.toLowerCase()) {
      return false;
    }
    return true;
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'mentions':
        return b.mentions_count - a.mentions_count;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Chats</h1>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Time Range Filter */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Last 7 days</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 days</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Model Filter */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-40">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4" />
                  <span>All Models</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-models">All Models</SelectItem>
              <SelectItem value="chatgpt">ChatGPT</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <ArrowUpDown className="h-4 w-4" />
                  <span>Newest</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="mentions">Most Mentions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-500">Total Chats</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{chats.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-500">Succeeded</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {chats.filter(c => c.status === 'succeeded').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-500">Total Sources</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {chats.reduce((sum, chat) => sum + chat.sources_count, 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-gray-500">Total Mentions</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {chats.reduce((sum, chat) => sum + chat.mentions_count, 0)}
          </p>
        </div>
      </div>

      {/* Chat Cards */}
      <div className="space-y-4">
        {sortedChats.map((chat) => (
          <div
            key={chat.id}
            className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => navigate(`/chats/${chat.id}`)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{chat.title}</h3>
                    {getStatusBadge(chat.status)}
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{chat.content}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span>{getModelIcon(chat.model_provider)}</span>
                        <span>{chat.model_provider}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Globe className="h-4 w-4" />
                        <span>{chat.country}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTimeAgo(chat.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{chat.mentions_count} mentions</span>
                      <span>{chat.sources_count} sources</span>
                      <span>{chat.citations_count} citations</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span>Loading chats...</span>
          </div>
        </div>
      )}

      {!loading && sortedChats.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No chats found</h3>
          <p className="text-gray-500">Try adjusting your filters or search query.</p>
        </div>
      )}
    </div>
  );
}