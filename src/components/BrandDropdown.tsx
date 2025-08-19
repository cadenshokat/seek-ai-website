
import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrands } from '@/hooks/useBrands';

export function BrandDropdown() {
  const { selectedBrand, setSelectedBrand, getBrandOptions, getSelectedBrandName, loading } = useBrands();

  if (loading) {
    return (
      <div className="w-48 h-8 bg-gray-100 rounded-md animate-pulse" />
    );
  }

  return (
    <Select 
      value={selectedBrand || 'all'} 
      onValueChange={(value) => setSelectedBrand(value === 'all' ? null : value)}
    >
      <SelectTrigger className="w-44 bg-white border-gray-300">
        <SelectValue>
          <div className="flex items-center space-x-1">
            <span className="text-xs font-medium">{getSelectedBrandName}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-white border border-gray-200 shadow-lg">
        <SelectItem value="all" className="hover:bg-gray-50">
          <div className="flex items-center space-x-1 text-xs">
            <span>All Brands</span>
          </div>
        </SelectItem>
        {getBrandOptions.map((option) => (
          <SelectItem key={option.id} value={option.id} className="hover:bg-gray-50 text-xs">
            <div className="flex items-center space-x-2">
              {option.logo && (
                <img 
                  className="w-4 h-4 rounded-full" 
                  src={option.logo}
                  alt={option.name}
                />
              )}
              <span>{option.name}</span>
              <span className="text-xs text-gray-500 capitalize">({option.type})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
