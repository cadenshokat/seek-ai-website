
import React from 'react';
import { BrandDropdown } from '@/components/BrandDropdown';
import { ModelsDropdown } from '@/components/ModelsDropdown';
import { TimeRangeDropdown } from '@/components/TimeRangeDropdown';

export function FiltersHeader() {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center space-x-4">
        <BrandDropdown />
        <ModelsDropdown />
        <TimeRangeDropdown />
      </div>
    </div>
  );
}
