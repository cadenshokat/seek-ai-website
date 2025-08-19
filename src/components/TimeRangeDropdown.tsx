
import React, { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useTimeRange } from '@/hooks/useTimeRange';
import { format } from 'date-fns';

export function TimeRangeDropdown() {
  const { selectedRange, defaultRanges, updateRange, updateCustomRange } = useTimeRange();
  const [isCustom, setIsCustom] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const handleRangeSelect = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      return;
    }
    
    const range = defaultRanges.find(r => r.label === value);
    if (range) {
      updateRange(range);
      setIsCustom(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (startDate && endDate) {
      updateCustomRange(startDate, endDate);
      setIsCustom(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Select 
        value={isCustom ? 'custom' : selectedRange.label} 
        onValueChange={handleRangeSelect}
      >
        <SelectTrigger className="w-44 bg-white border-gray-300 text-xs">
          <SelectValue>
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{selectedRange.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg">
          {defaultRanges.map((range) => (
            <SelectItem key={range.label} value={range.label} className="hover:bg-gray-50 text-xs">
              {range.label}
            </SelectItem>
          ))}
          <SelectItem value="custom" className="hover:bg-gray-50 text-xs">
            Custom Range
          </SelectItem>
        </SelectContent>
      </Select>

      {isCustom && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-auto">
              {startDate && endDate ? (
                `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`
              ) : (
                'Pick dates'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg" align="start">
            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    className="rounded-md border"
                  />
                </div>
                <Button 
                  onClick={handleCustomRangeApply} 
                  className="w-full"
                  disabled={!startDate || !endDate}
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
