import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Globe, Clock, User, Copy, ExternalLink, Download, Flag, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatDetail {
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

interface ChatSource {
  id: string;
  source_name: string;
  source_url: string;
  created_at: string;
}

interface ChatCitation {
  id: string;
  citation_text: string;
  source_url: string;
  position: number;
  created_at: string;
}

interface ChatBrand {
  id: string;
  brand_name: string;
  brand_logo?: string;
  created_at: string;
}

const SAMPLE_CHAT: ChatDetail = {
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
};

const SAMPLE_SOURCES: ChatSource[] = [
  {
    id: '1',
    source_name: 'Hear.com Financing Options',
    source_url: 'https://hear.com/financing',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    source_name: 'AudioNova Payment Plans',
    source_url: 'https://audionova.com/payment-plans',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    source_name: 'Phonak Financing Guide',
    source_url: 'https://phonak.com/financing',
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    source_name: 'Medicare Hearing Aid Coverage',
    source_url: 'https://medicare.gov/hearing-aids',
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    source_name: 'Audiologist Network Payment Options',
    source_url: 'https://audiologists.org/payment',
    created_at: new Date().toISOString()
  }
];

const SAMPLE_CITATIONS: ChatCitation[] = [
  {
    id: '1',
    citation_text: 'Many hearing aid providers offer 0% financing for 12-24 months for qualified buyers.',
    source_url: 'https://hear.com/financing',
    position: 1,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    citation_text: 'Premium hearing aids typically range from $3,000 to $6,000 per pair.',
    source_url: 'https://audionova.com/payment-plans',
    position: 2,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    citation_text: 'Some insurance plans cover up to $2,500 per hearing aid every 3-5 years.',
    source_url: 'https://medicare.gov/hearing-aids',
    position: 3,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    citation_text: 'Monthly payment plans can range from $99 to $299 per month depending on the device.',
    source_url: 'https://phonak.com/financing',
    position: 4,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    citation_text: 'Many audiologists partner with CareCredit for medical financing options.',
    source_url: 'https://audiologists.org/payment',
    position: 5,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    citation_text: 'Lease-to-own programs allow for lower monthly payments with eventual ownership.',
    source_url: 'https://hear.com/financing',
    position: 6,
    created_at: new Date().toISOString()
  },
  {
    id: '7',
    citation_text: 'HSA and FSA funds can be used for hearing aid purchases to reduce out-of-pocket costs.',
    source_url: 'https://medicare.gov/hearing-aids',
    position: 7,
    created_at: new Date().toISOString()
  }
];

const SAMPLE_BRANDS: ChatBrand[] = [
  {
    id: '1',
    brand_name: 'Hear.com',
    brand_logo: 'https://hear.com/logo.png',
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    brand_name: 'Phonak',
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    brand_name: 'AudioNova',
    created_at: new Date().toISOString()
  }
];

const CHAT_RESPONSE = `Based on your question about monthly payment plans for high-end hearing devices, here are the key financing options available:

## Financing Options for Premium Hearing Aids

### Traditional Financing
- **0% Interest Plans**: Many providers offer 12-24 month interest-free financing for qualified buyers
- **Extended Payment Plans**: Monthly payments typically range from $99-$299 depending on device cost
- **Down Payment Options**: Some plans require 10-20% down, others offer no money down

### Alternative Financing
- **CareCredit**: Medical credit card accepted by most audiologists with promotional periods
- **Lease-to-Own**: Lower monthly payments with eventual ownership transfer
- **Employer Benefits**: Some companies offer hearing aid benefits through FSA/HSA programs

### Insurance & Coverage
- **Private Insurance**: Many plans cover $1,000-$2,500 per hearing aid every 3-5 years
- **Medicare Advantage**: Some plans include hearing aid benefits
- **Veterans Benefits**: VA covers hearing aids for eligible veterans

### Cost Considerations
Premium hearing aids typically cost $3,000-$6,000 per pair. With financing:
- 12-month plan: ~$250-$500/month
- 24-month plan: ~$125-$250/month
- 36-month plan: ~$85-$170/month

### Recommendations
1. **Compare Multiple Providers**: Different audiologists offer different financing terms
2. **Check Insurance First**: Maximize any existing coverage before financing
3. **Consider HSA/FSA**: Use pre-tax dollars to reduce overall cost
4. **Read Terms Carefully**: Understand interest rates, fees, and payment schedules

Would you like more specific information about any of these financing options?`;

export function ChatDetail() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [chat, setChat] = useState<ChatDetail | null>(SAMPLE_CHAT);
  const [sources, setSources] = useState<ChatSource[]>(SAMPLE_SOURCES);
  const [citations, setCitations] = useState<ChatCitation[]>(SAMPLE_CITATIONS);
  const [brands, setBrands] = useState<ChatBrand[]>(SAMPLE_BRANDS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('response');
  const { toast } = useToast();

  useEffect(() => {
    if (chatId) {
      fetchChatDetail(chatId);
    }
  }, [chatId]);

  const fetchChatDetail = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch chat details
      const { data: chatData, error: chatError } = await supabase
        .from('prompt_chats')
        .select('*')
        .eq('id', id)
        .single();

      if (chatError) throw chatError;

      // Fetch sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('chat_sources')
        .select('*')
        .eq('chat_id', id);

      if (sourcesError) throw sourcesError;

      // Fetch citations
      const { data: citationsData, error: citationsError } = await supabase
        .from('chat_citations')
        .select('*')
        .eq('chat_id', id)
        .order('position');

      if (citationsError) throw citationsError;

      // Fetch brands
      const { data: brandsData, error: brandsError } = await supabase
        .from('chat_brands')
        .select('*')
        .eq('chat_id', id);

      if (brandsError) throw brandsError;

      // For now, use sample data since we don't have real data yet
      // setChat(chatData);
      // setSources(sourcesData || []);
      // setCitations(citationsData || []);
      // setBrands(brandsData || []);
      
    } catch (error) {
      console.error('Error fetching chat details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch chat details",
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

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(CHAT_RESPONSE);
    toast({
      title: "Copied",
      description: "Response copied to clipboard",
    });
  };

  const handleExport = () => {
    const exportData = {
      chat,
      sources,
      citations,
      brands,
      response: CHAT_RESPONSE
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chatId}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          <span>Loading chat details...</span>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Chat not found</h3>
        <p className="text-gray-500">The requested chat could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/chats')} className="cursor-pointer">
              Chats
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{chat.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/chats')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Chats</span>
            </Button>
            {getStatusBadge(chat.status)}
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{chat.title}</h1>
          
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
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleCopyResponse}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-500">Mentions</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{chat.mentions_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-500">Sources</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{chat.sources_count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Flag className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-500">Citations</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{chat.citations_count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
          <TabsTrigger value="citations">Citations ({citations.length})</TabsTrigger>
          <TabsTrigger value="brands">Brands ({brands.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="response" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>AI Response</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <ThumbsUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Star className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {CHAT_RESPONSE}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{source.source_name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{source.source_url}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(source.source_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="citations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Citations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {citations.map((citation) => (
                  <div
                    key={citation.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {citation.position}
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-700 mb-2">"{citation.citation_text}"</p>
                        <div className="flex items-center space-x-2">
                          <a
                            href={citation.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {citation.source_url}
                          </a>
                          <ExternalLink className="h-3 w-3 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Mentioned Brands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="p-4 border border-gray-200 rounded-lg text-center"
                  >
                    {brand.brand_logo ? (
                      <img
                        src={brand.brand_logo}
                        alt={brand.brand_name}
                        className="w-12 h-12 mx-auto mb-2 rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <h4 className="font-medium text-gray-900">{brand.brand_name}</h4>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}