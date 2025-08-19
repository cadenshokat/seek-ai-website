import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, ChevronLeft, MoreVertical, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBrands } from '@/hooks/useBrands';
import { CompetitorChat } from '@/components/CompetitorChat';

interface Competitor {
  id: string;
  name: string;
  color?: string;
  logo?: string;
  website?: string;
  brand_id: string;
}

interface CompetitorMention {
  id: string;
  sentence_mentioned: string;
  sentiment: string;
  date: string;
  position: number;
}

interface CompetitorDetails extends Competitor {
  mentions: CompetitorMention[];
  totalMentions: number;
  avgPosition: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export function Competitors() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { brands } = useBrands();

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitorDetails = async (competitorId: string) => {
    try {
      setLoading(true);
      
      // Fetch competitor basic info
      const { data: competitor, error: competitorError } = await supabase
        .from('competitors')
        .select('*')
        .eq('id', competitorId)
        .single();

      if (competitorError) throw competitorError;

      // Fetch competitor mentions
      const { data: mentions, error: mentionsError } = await supabase
        .from('competitor_mentions')
        .select('*')
        .eq('competitor_id', competitorId)
        .order('date', { ascending: false })
        .limit(50);

      if (mentionsError) throw mentionsError;

      // Calculate metrics
      const totalMentions = mentions?.length || 0;
      const avgPosition = mentions?.length > 0 
        ? mentions.reduce((sum, m) => sum + m.position, 0) / mentions.length 
        : 0;

      const sentimentBreakdown = mentions?.reduce((acc, mention) => {
        acc[mention.sentiment as keyof typeof acc] = (acc[mention.sentiment as keyof typeof acc] || 0) + 1;
        return acc;
      }, { positive: 0, neutral: 0, negative: 0 }) || { positive: 0, neutral: 0, negative: 0 };

      const competitorDetails: CompetitorDetails = {
        ...competitor,
        mentions: mentions || [],
        totalMentions,
        avgPosition: Math.round(avgPosition * 10) / 10,
        sentimentBreakdown
      };

      setSelectedCompetitor(competitorDetails);
    } catch (error) {
      console.error('Error fetching competitor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBrandName = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    return brand?.name || 'Unknown Brand';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (selectedCompetitor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedCompetitor(null)}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Competitors</span>
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center space-x-3">
              {selectedCompetitor.logo && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedCompetitor.logo} alt={selectedCompetitor.name} />
                  <AvatarFallback>{selectedCompetitor.name.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <span className="text-lg font-medium">{selectedCompetitor.name}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Flag className="h-4 w-4 mr-1" />
              Report Issue
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="p-6">
              <div className="flex items-start space-x-4 mb-6">
                {selectedCompetitor.logo && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedCompetitor.logo} alt={selectedCompetitor.name} />
                    <AvatarFallback className="text-lg">{selectedCompetitor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{selectedCompetitor.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                    <Badge variant="secondary">Competitor</Badge>
                    <span>Brand: {getBrandName(selectedCompetitor.brand_id)}</span>
                  </div>
                  {selectedCompetitor.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedCompetitor.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{selectedCompetitor.totalMentions}</div>
                  <div className="text-sm text-gray-600">Total Mentions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{selectedCompetitor.avgPosition}</div>
                  <div className="text-sm text-gray-600">Avg Position</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((selectedCompetitor.sentimentBreakdown.positive / selectedCompetitor.totalMentions) * 100) || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Positive Sentiment</div>
                </div>
              </div>

              <Tabs defaultValue="chat">
                <TabsList>
                  <TabsTrigger value="chat">AI Analysis</TabsTrigger>
                  <TabsTrigger value="mentions">Recent Mentions</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>
                
                <TabsContent value="chat" className="space-y-4">
                  <CompetitorChat competitorId={selectedCompetitor.id} competitorName={selectedCompetitor.name} />
                </TabsContent>

                <TabsContent value="mentions" className="space-y-4">
                  {selectedCompetitor.mentions.length > 0 ? (
                    selectedCompetitor.mentions.map((mention) => (
                      <div key={mention.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className={getSentimentColor(mention.sentiment)}>
                              {mention.sentiment}
                            </Badge>
                            <span className="text-sm text-gray-600">Position {mention.position}</span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(mention.date)}</span>
                        </div>
                        <p className="text-gray-800">{mention.sentence_mentioned}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No mentions found for this competitor.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="analytics">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-lg font-semibold text-green-800">
                        {selectedCompetitor.sentimentBreakdown.positive}
                      </div>
                      <div className="text-sm text-green-600">Positive Mentions</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-lg font-semibold text-gray-800">
                        {selectedCompetitor.sentimentBreakdown.neutral}
                      </div>
                      <div className="text-sm text-gray-600">Neutral Mentions</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-lg font-semibold text-red-800">
                        {selectedCompetitor.sentimentBreakdown.negative}
                      </div>
                      <div className="text-sm text-red-600">Negative Mentions</div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3">Related Brands</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-6 h-6 bg-blue-500 rounded" />
                  <span className="text-sm">{getBrandName(selectedCompetitor.brand_id)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">Sources</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <span>Direct mentions</span>
                  <Badge variant="secondary">{selectedCompetitor.totalMentions}</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Competitors</h1>
          <p className="text-gray-600">Monitor and analyze your competitors</p>
        </div>
        <Button>Add Competitor</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : competitors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitors.map((competitor) => (
            <Card 
              key={competitor.id} 
              className="p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => fetchCompetitorDetails(competitor.id)}
            >
              <div className="flex items-center space-x-3 mb-4">
                {competitor.logo && (
                  <Avatar>
                    <AvatarImage src={competitor.logo} alt={competitor.name} />
                    <AvatarFallback>{competitor.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{competitor.name}</h3>
                  <p className="text-sm text-gray-600">{getBrandName(competitor.brand_id)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                {competitor.website && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Website</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={competitor.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No competitors found</div>
          <Button>Add Your First Competitor</Button>
        </div>
      )}
    </div>
  );
}