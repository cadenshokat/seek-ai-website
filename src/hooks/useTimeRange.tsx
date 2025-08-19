import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

function makeDefaultRanges(): TimeRange[] {
  const now = Date.now();
  return [
    { label: "Last 7 days",  start: new Date(now - 7 * 24 * 60 * 60 * 1000),  end: new Date() },
    { label: "Last 30 days", start: new Date(now - 30 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: "Last 90 days", start: new Date(now - 90 * 24 * 60 * 60 * 1000), end: new Date() },
  ];
}

interface TimeRangeContextValue {
  selectedRange: TimeRange;
  customRange: { start: Date | null; end: Date | null };
  defaultRanges: TimeRange[];
  updateRange: (range: TimeRange) => void;
  updateCustomRange: (start: Date, end: Date) => void;
  setSelectedRange: React.Dispatch<React.SetStateAction<TimeRange>>;
}

const TimeRangeContext = createContext<TimeRangeContextValue | undefined>(undefined);

export function TimeRangeProvider({ children }: { children: ReactNode }) {
  const defaultRanges = useMemo(() => makeDefaultRanges(), []);
  const [selectedRange, setSelectedRange] = useState<TimeRange>(defaultRanges[0]);
  const [customRange, setCustomRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const updateRange = (range: TimeRange) => {
    setSelectedRange(range);
    setCustomRange({ start: null, end: null });
  };

  const updateCustomRange = (start: Date, end: Date) => {
    const r: TimeRange = { start, end, label: "Custom Range" };
    setSelectedRange(r);
    setCustomRange({ start, end });
  };

  const value: TimeRangeContextValue = {
    selectedRange,
    customRange,
    defaultRanges,
    updateRange,
    updateCustomRange,
    setSelectedRange,
  };

  return <TimeRangeContext.Provider value={value}>{children}</TimeRangeContext.Provider>;
}

export function useTimeRange(): TimeRangeContextValue {
  const ctx = useContext(TimeRangeContext);
  if (!ctx) throw new Error("useTimeRange must be used within a TimeRangeProvider");
  return ctx;
}
