
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModels } from '@/hooks/useModels';

export function ModelsDropdown() {
  const { models, selectedModel, setSelectedModel, getSelectedModelName, loading } = useModels();

  if (loading) {
    return (
      <div className="w-48 h-10 bg-gray-100 rounded-md animate-pulse" />
    );
  }

  return (
    <Select 
      value={selectedModel || 'all'} 
      onValueChange={(value) => setSelectedModel(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-44 bg-white border-gray-300">
        <SelectValue>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium">{getSelectedModelName()}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 shadow-lg">
        <SelectItem value="all" className="hover:bg-gray-50 text-xs">
          All Models
        </SelectItem>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} className="hover:bg-gray-50 text-xs">
            <div className="flex items-center space-x-2">
              {model.logo && (
                <img src={model.logo} alt={model.name} className="w-4 h-4 rounded" />
              )}
              <span>{model.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
