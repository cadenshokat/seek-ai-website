import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Brand {
  id: string;
  name: string;
  color?: string;
  logo?: string;
  website?: string;
  is_primary: boolean;
  org_id: string;
}

export interface Competitor {
  id: string;
  name?: string;
  color?: string;
  logo?: string;
  website?: string;
  brand_id: string;
}

export interface BrandOption {
  id: string;
  name: string;
  type: "brand" | "competitor";
  color?: string;
  logo?: string;
}

interface BrandsContextValue {
  brands: Brand[];
  competitors: Competitor[];
  selectedBrand: string | null;
  setSelectedBrand: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  getBrandOptions: BrandOption[];
  getSelectedBrandName: string;
}

const BrandsContext = createContext<BrandsContextValue | undefined>(undefined);

export function BrandsProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBrandsAndCompetitors() {
      try {
        setLoading(true);

        const { data: brandsData, error: brandsError } = await supabase
          .from("brands")
          .select("*")
          .order("name");

        if (brandsError) throw brandsError;

        const { data: competitorsData, error: competitorsError } = await supabase
          .from("competitors")
          .select("*")
          .order("name");

        if (competitorsError) throw competitorsError;

        setBrands(brandsData || []);
        setCompetitors(competitorsData || []);

        if (!selectedBrand) {
          const primary = brandsData?.find((b) => b.is_primary);
          if (primary) setSelectedBrand(primary.id);
          else if (brandsData && brandsData.length > 0) setSelectedBrand(brandsData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch brands");
      } finally {
        setLoading(false);
      }
    }

    fetchBrandsAndCompetitors();
  }, []);

  const getBrandOptions = useMemo<BrandOption[]>(() => {
    const brandOptions = brands.map((b) => ({
      id: b.id,
      name: b.name,
      type: "brand" as const,
      color: b.color,
      logo: b.logo,
    }));
    const competitorOptions = competitors.map((c) => ({
      id: c.id,
      name: c.name || "Unnamed Competitor",
      type: "competitor" as const,
      color: c.color,
      logo: c.logo,
    }));
    return [...brandOptions, ...competitorOptions];
  }, [brands, competitors]);

  const getSelectedBrandName = useMemo(() => {
    if (!selectedBrand) return "All Brands";
    const b = brands.find((x) => x.id === selectedBrand);
    if (b) return b.name;
    const c = competitors.find((x) => x.id === selectedBrand);
    return c?.name || "Unknown";
  }, [selectedBrand, brands, competitors]);

  const value: BrandsContextValue = {
    brands,
    competitors,
    selectedBrand,
    setSelectedBrand,
    loading,
    error,
    getBrandOptions,
    getSelectedBrandName,
  };

  return <BrandsContext.Provider value={value}>{children}</BrandsContext.Provider>;
}

export function useBrands(): BrandsContextValue {
  const ctx = useContext(BrandsContext);
  if (!ctx) throw new Error("useBrands must be used within a BrandsProvider");
  return ctx;
}
