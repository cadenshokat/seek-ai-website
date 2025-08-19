import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Download, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface WorkspaceData {
  id: string;
  name: string;
  domain: string;
  ip_address: string;
  country_code: string;
  country_name: string;
}

interface WorkspaceModel {
  id: string;
  model_name: string;
  model_provider: string;
  is_enabled: boolean;
  icon: string;
}

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
];

export function Workspace() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [models, setModels] = useState<WorkspaceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    try {
      // Fetch workspace settings
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace')
        .select('*')
        .limit(1)
        .single();

      if (workspaceError && workspaceError.code !== 'PGRST116') {
        throw workspaceError;
      }

      if (workspaceData) {
        setWorkspace(workspaceData);

        // Fetch models for this workspace
        const { data: modelsData, error: modelsError } = await supabase
          .from('workspace_models')
          .select('*')
          .eq('workspace_id', workspaceData.id)
          .order('model_name');

        if (modelsError) throw modelsError;
        setModels(modelsData || []);
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error);
      toast({
        title: "Error",
        description: "Failed to load workspace settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceUpdate = async (field: keyof WorkspaceData, value: string) => {
    if (!workspace) return;

    const updatedWorkspace = { ...workspace, [field]: value };
    setWorkspace(updatedWorkspace);
  };

  const handleCountryChange = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country && workspace) {
      setWorkspace({
        ...workspace,
        country_code: country.code,
        country_name: country.name
      });
    }
  };

  const handleModelToggle = async (modelId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('workspace_models')
        .update({ is_enabled: enabled })
        .eq('id', modelId);

      if (error) throw error;

      setModels(prev => 
        prev.map(model => 
          model.id === modelId ? { ...model, is_enabled: enabled } : model
        )
      );

      toast({
        title: "Success",
        description: `Model ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      console.error('Error updating model:', error);
      toast({
        title: "Error",
        description: "Failed to update model settings",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!workspace) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('workspace')
        .update({
          name: workspace.name,
          domain: workspace.domain,
          ip_address: workspace.ip_address,
          country_code: workspace.country_code,
          country_name: workspace.country_name
        })
        .eq('id', workspace.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Workspace settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving workspace:', error);
      toast({
        title: "Error",
        description: "Failed to save workspace settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportChatHistory = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-chat-history');

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Chat history exported successfully",
      });
    } catch (error) {
      console.error('Error exporting chat history:', error);
      toast({
        title: "Error",
        description: "Failed to export chat history",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const getCountryFlag = (countryCode: string) => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    return country?.flag || '🌍';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No workspace found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Workspace</h1>
        <p className="text-gray-600">Manage your workspace settings and configurations</p>
      </div>

      {/* Edit Workspace */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Edit Workspace</h2>
        
        <div className="space-y-6">
          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={workspace.name}
              onChange={(e) => handleWorkspaceUpdate('name', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Domain */}
          <div>
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              type="text"
              value={workspace.domain || ''}
              onChange={(e) => handleWorkspaceUpdate('domain', e.target.value)}
              className="mt-1"
              placeholder="example.com"
            />
          </div>

          {/* IP Address / Country */}
          <div>
            <Label htmlFor="country">IP Address</Label>
            <Select value={workspace.country_code} onValueChange={handleCountryChange}>
              <SelectTrigger className="mt-1">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCountryFlag(workspace.country_code)}</span>
                    <span>{workspace.country_name}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{country.flag}</span>
                      <span>{country.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Models */}
          <div>
            <Label>Models</Label>
            <div className="mt-3 space-y-3">
              {models.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{model.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{model.model_name}</div>
                      <div className="text-sm text-gray-500">{model.model_provider}</div>
                    </div>
                  </div>
                  <Switch
                    checked={model.is_enabled}
                    onCheckedChange={(checked) => handleModelToggle(model.id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="flex items-center space-x-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
        <p className="text-gray-600 mb-4">Manage your workspace and export data.</p>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Export Chat History</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Download a complete archive of all chat messages as a JSON file.
                </p>
              </div>
              <Button
                onClick={handleExportChatHistory}
                disabled={exporting}
                variant="outline"
                className="flex items-center space-x-2 ml-4"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>Export</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}