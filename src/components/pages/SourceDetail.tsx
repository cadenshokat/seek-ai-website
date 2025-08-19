import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Tag, 
  User, 
  Zap, 
  Download, 
  ExternalLink,
  ArrowUpDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SourceUrlData {
  id: string;
  url: string;
  mentioned: boolean;
  mentions: number;
  used_total: number;
  avg_citations: number;
  updated: string;
}

interface ChatData {
  id: string;
  content: string;
  mentions: number;
  created: string;
  source: string;
  used: string;
  status: 'active' | 'pending' | 'not-triggered';
}

// Sample chart data based on the reference image
const CHART_DATA = [
  { date: 'Jul 22', url1: 6, url2: 3, url3: 4, url4: 5, url5: 3 },
  { date: 'Jul 23', url1: 4, url2: 4, url3: 3, url4: 4, url5: 4 },
  { date: 'Jul 24', url1: 4, url2: 6, url3: 4, url4: 3, url5: 5 },
  { date: 'Jul 25', url1: 3, url2: 4, url3: 5, url4: 4, url5: 4 },
  { date: 'Jul 26', url1: 4, url2: 3, url3: 4, url4: 5, url5: 3 },
  { date: 'Jul 27', url1: 3, url2: 4, url3: 3, url4: 4, url5: 4 },
  { date: 'Jul 28', url1: 4, url2: 3, url3: 4, url4: 3, url5: 6 },
  { date: 'Jul 29', url1: 6, url2: 4, url3: 2, url4: 4, url5: 3 },
];

// Sample URL data based on the reference image
const SAMPLE_URLS: SourceUrlData[] = [
  {
    id: '1',
    url: 'www.hearingtracker.com/hearing-aids/horizon-mini-ix-hearing-aid-from-hear-com',
    mentioned: false,
    mentions: 6,
    used_total: 27,
    avg_citations: 2.7,
    updated: 'Unknown'
  },
  {
    id: '2', 
    url: 'hear.com Horizon Go iX Hearing Aids: Reviews, Prices, and more\nwww.hearingtracker.com/hearing-aids/hear-com-horizon-go-ix',
    mentioned: true,
    mentions: 6,
    used_total: 35,
    avg_citations: 3.5,
    updated: '8 hr. ago'
  },
  {
    id: '3',
    url: 'forum.hearingtracker.com/t/hear-com-horizon-ix/87548',
    mentioned: false,
    mentions: 1,
    used_total: 10,
    avg_citations: 1.0,
    updated: 'Unknown'
  },
  {
    id: '4',
    url: 'forum.hearingtracker.com/t/horizon-ix-know-anything-about-them-good-bad-help-scam-or-is-it-for-mild-loss-only/88213',
    mentioned: false,
    mentions: 1,
    used_total: 40,
    avg_citations: 4.0,
    updated: 'Unknown'
  }
];

// Sample chat data
const SAMPLE_CHATS: ChatData[] = [
  {
    id: '1',
    content: 'The Horizon iX is a line of advanced hearing aids based on the Signia iX platform, featuring dual-processing technology for enhanced listening experiences.',
    mentions: 3,
    created: '14 hr. ago',
    source: 'hearingtracker.com',
    used: '236%',
    status: 'active'
  },
  {
    id: '2',
    content: 'Comprehensive review of Horizon Go iX hearing aids including pricing, features, and user testimonials.',
    mentions: 2,
    created: '1 day ago', 
    source: 'hearingtracker.com',
    used: '127%',
    status: 'active'
  },
  {
    id: '3',
    content: 'Community discussion about Horizon iX effectiveness for different hearing loss levels.',
    mentions: 1,
    created: '2 days ago',
    source: 'hearingtracker.com',
    used: '36%',
    status: 'pending'
  }
];

export function SourceDetail() {
  const { promptId, sourceId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('urls');
  const [timeRange, setTimeRange] = useState('last-7-days');
  const [selectedTags, setSelectedTags] = useState('all-tags');
  const [selectedBrand, setSelectedBrand] = useState('oticon');
  const [selectedModels, setSelectedModels] = useState('all-models');
  const [urlData, setUrlData] = useState<SourceUrlData[]>(SAMPLE_URLS);
  const [chatData, setChatData] = useState<ChatData[]>(SAMPLE_CHATS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sourceName = sourceId || 'hearingtracker.com';
  const promptText = 'What is the Horizon iX?';

  const handleExport = async () => {
    try {
      const exportData = {
        source: sourceName,
        prompt: promptText,
        timeRange,
        urls: urlData,
        chats: chatData,
        chartData: CHART_DATA,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sourceName}-source-data.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Source data exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const formatUrl = (url: string) => {
    if (url.includes('\n')) {
      const lines = url.split('\n');
      return (
        <div>
          <div className="font-medium text-blue-600">{lines[0]}</div>
          <div className="text-sm text-gray-500">{lines[1]}</div>
        </div>
      );
    }
    return <span className="text-blue-600">{url}</span>;
  };

  const getMentionedIcon = (mentioned: boolean) => {
    return mentioned ? (
      <Eye className="h-4 w-4 text-green-500" />
    ) : (
      <EyeOff className="h-4 w-4 text-gray-400" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'not-triggered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/prompts">Prompts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/prompts/${promptId}`}>Item</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Sources</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sourceName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center space-x-4">
          {/* Filters */}
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

          <Select value={selectedTags} onValueChange={setSelectedTags}>
            <SelectTrigger className="w-32">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <span>All Tags</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-tags">All Tags</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="review">Review</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-32">
              <SelectValue>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Oticon</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oticon">Oticon</SelectItem>
              <SelectItem value="hear-com">Hear.com</SelectItem>
              <SelectItem value="signia">Signia</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedModels} onValueChange={setSelectedModels}>
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
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Source Info */}
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
          H
        </div>
        <span className="text-lg font-medium text-gray-900">{sourceName} • {promptText}</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="urls">URLs</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
        </TabsList>

        <TabsContent value="urls" className="space-y-6">
          {/* Chart */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Source Usage by URLs</h3>
              <p className="text-sm text-gray-600">Times the Top 5 URLs were sourced in the Chats</p>
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={CHART_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 8]} />
                  <Legend />
                  <Line type="monotone" dataKey="url1" stroke="#8884d8" strokeWidth={2} name="URL 1" />
                  <Line type="monotone" dataKey="url2" stroke="#82ca9d" strokeWidth={2} name="URL 2" />
                  <Line type="monotone" dataKey="url3" stroke="#ffc658" strokeWidth={2} name="URL 3" />
                  <Line type="monotone" dataKey="url4" stroke="#ff7300" strokeWidth={2} name="URL 4" />
                  <Line type="monotone" dataKey="url5" stroke="#8dd1e1" strokeWidth={2} name="URL 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* URLs Table */}
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600 text-sm">
                      <div className="flex items-center space-x-1">
                        <span>URL</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Mentioned</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Mentions</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Used total</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Avg. Citations</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600 text-sm">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Updated</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {urlData.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-25">
                      <td className="py-4 px-4 max-w-md">
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold mt-1">
                            H
                          </div>
                          <div className="flex-1">
                            {formatUrl(item.url)}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {item.mentioned ? 'No' : 'Unknown'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                            H
                          </div>
                          <span className="font-medium">{item.mentions}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">
                        {item.used_total}
                      </td>
                      <td className="py-4 px-4 text-center font-medium">
                        {item.avg_citations}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-500">
                        {item.updated === 'Unknown' ? (
                          <span>Unknown</span>
                        ) : (
                          <div className="flex items-center justify-center space-x-1">
                            <span>{item.updated}</span>
                            <Eye className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="chats" className="space-y-6">
          {/* Chats Table */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Chats from {sourceName}</h3>
              <p className="text-sm text-gray-600">All chats mentioning this source</p>
            </div>

            <div className="space-y-4">
              {chatData.map((chat) => (
                <div 
                  key={chat.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
                  onClick={() => navigate(`/chats/${chat.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(chat.status)}>
                        {chat.status.replace('-', ' ')}
                      </Badge>
                      <span className="text-sm text-gray-600">{chat.mentions} mentions</span>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <span>{chat.created}</span>
                        <span>•</span>
                        <span>{chat.used}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 leading-relaxed mb-3">{chat.content}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                        H
                      </div>
                      <span className="text-sm text-blue-600">{chat.source}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}