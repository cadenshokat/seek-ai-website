import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useBrands } from '@/hooks/useBrands';
import { useTimeRange } from '@/hooks/useTimeRange';

interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  used: number;
  avgCitations: number;
}

interface DomainData {
  day: string;
  [key: string]: any;
}

export function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [domainData, setDomainData] = useState<DomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedBrand } = useBrands();
  const { selectedRange } = useTimeRange();

  useEffect(() => {
    fetchSources();
  }, [selectedBrand, selectedRange]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedBrand) {
        query = query.eq('brand_id', selectedBrand);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data for the sources table
      const transformedSources = data?.map((source) => ({
        id: source.id,
        name: source.name,
        url: source.url,
        type: source.type,
        used: Math.floor(Math.random() * 40) + 10,
        avgCitations: parseFloat((Math.random() * 2 + 1).toFixed(1)), // Convert string to number
      })) || [];

      setSources(transformedSources);

      // Generate mock chart data for domains
      const mockDomainData = generateMockChartData();
      setDomainData(mockDomainData);
    } catch (error) {
      console.error('Error fetching sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockChartData = () => {
    const days = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStr = `Jul ${date.getDate()}`;
      
      days.push({
        day: dayStr,
        'hearingtracker.com': Math.random() * 40 + 10,
        'seniorliving.org': Math.random() * 35 + 15,
        'reddit.com': Math.random() * 30 + 20,
        'ncoa.org': Math.random() * 25 + 15,
        'healthyhearing.com': Math.random() * 20 + 10,
      });
    }
    
    return days;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors = {
      'Reference': 'bg-blue-100 text-blue-800',
      'Editorial': 'bg-green-100 text-green-800',
      'UGC': 'bg-purple-100 text-purple-800',
      'Institutional': 'bg-orange-100 text-orange-800',
      'You': 'bg-gray-100 text-gray-800',
      'Competitor': 'bg-red-100 text-red-800',
      'Corporate': 'bg-yellow-100 text-yellow-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Sources</h1>
        </div>
      </div>

      <Tabs defaultValue="domains" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="urls">URLs</TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Source Usage by Domain</h3>
              <p className="text-sm text-gray-500">Times the Top 5 Domains were sourced in the Chats</p>
            </div>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={domainData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Legend />
                  <Line type="monotone" dataKey="hearingtracker.com" stroke="#ff6b6b" strokeWidth={2} />
                  <Line type="monotone" dataKey="seniorliving.org" stroke="#4ecdc4" strokeWidth={2} />
                  <Line type="monotone" dataKey="reddit.com" stroke="#45b7d1" strokeWidth={2} />
                  <Line type="monotone" dataKey="ncoa.org" stroke="#96ceb4" strokeWidth={2} />
                  <Line type="monotone" dataKey="healthyhearing.com" stroke="#feca57" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">Source</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 text-sm">Type</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 text-sm">Used</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 text-sm">Avg. Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {source.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{source.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={`${getTypeBadgeColor(source.type)} border-0`}>
                          {source.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-gray-900">{source.used}%</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-900">{source.avgCitations}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="urls" className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left py-4 px-6 font-medium text-gray-600 text-sm">URL</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 text-sm">Type</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 text-sm">Used</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-600 text-sm">Avg. Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source) => (
                    <tr key={source.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {source.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-600">{source.url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Badge className={`${getTypeBadgeColor(source.type)} border-0`}>
                          {source.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-gray-900">{source.used}%</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-gray-900">{source.avgCitations}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
